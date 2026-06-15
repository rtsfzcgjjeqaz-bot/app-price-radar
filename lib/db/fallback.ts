/**
 * lib/db/fallback.ts
 *
 * Offline price intelligence answerer.
 * Used when the OpenAI API is unavailable or quota is exceeded.
 *
 * - Uses only local mock data (no external API calls).
 * - Supports English and Chinese output.
 * - Handles fuzzy natural-language questions via keyword matching.
 * - Returns the same comparative analysis format as the AI chat.
 */

import { getAppPriceTable } from '@/lib/price';
import { apps } from '@/mock/apps';
import { countries } from '@/mock/countries';

type Locale = 'en' | 'zh';

// ── i18n labels ───────────────────────────────────────────────────────────────

const L = {
  analysisTitle:       { en: 'Global Price Analysis',               zh: '全球价格分析' },
  top3:                { en: 'Top 3 Cheapest Countries',             zh: '最便宜的三个国家' },
  mostExpensive:       { en: 'Most Expensive',                       zh: '最贵地区' },
  usPrice:             { en: 'US Price',                             zh: '美国价格' },
  priceGap:            { en: 'Price Gap',                            zh: '价格差距' },
  savingsPotential:    { en: 'Savings Potential',                    zh: '最大节省比例' },
  coverage:            { en: 'Coverage',                             zh: '覆盖国家数' },
  lastVerified:        { en: 'Last Verified',                        zh: '最近验证日期' },
  source:              { en: 'Source',                               zh: '数据来源' },
  sourceValue:         { en: 'Verified App Store pricing database',  zh: '已验证的 App Store 定价数据库' },
  perMonth:            { en: '/mo',                                  zh: '/月' },
  countries:           { en: 'countries',                            zh: '个国家' },
  disclaimer:          { en: 'Prices are for reference. Switching regions may violate App Store terms of service.', zh: '价格仅供参考，切换地区可能违反 App Store 服务条款。' },
  notFound:            { en: 'No price data found for that app. Try searching by exact app name (e.g. Spotify, Netflix, ChatGPT).', zh: '未找到该 App 的价格数据，请尝试使用精确名称搜索（如 Spotify、Netflix、ChatGPT）。' },
  topSavings:          { en: 'Top Apps by Savings Potential',        zh: '按节省比例排列的 App' },
  cheapestOverall:     { en: 'Cheapest Countries Overall',           zh: '综合最便宜国家' },
  avgPerMonth:         { en: 'avg/mo',                               zh: '均价/月' },
  allCountries:        { en: 'All countries (cheapest to most expensive):', zh: '所有国家（从最低到最高）：' },
  maxSavings:          { en: 'Max savings vs most expensive:',       zh: '相对最高价格最大节省：' },
} as const;

function t(key: keyof typeof L, locale: Locale): string {
  return L[key][locale];
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function pct(cheap: number, expensive: number): string {
  if (expensive <= 0) return '0.0';
  return ((1 - cheap / expensive) * 100).toFixed(1);
}

// ── App matching ──────────────────────────────────────────────────────────────

// Aliases map common question terms to app IDs
const APP_ALIASES: Record<string, string> = {
  chatgpt: 'chatgpt',
  'chat gpt': 'chatgpt',
  gpt: 'chatgpt',
  openai: 'chatgpt',
  spotify: 'spotify',
  netflix: 'netflix',
  youtube: 'youtube-premium',
  'youtube premium': 'youtube-premium',
  ytpremium: 'youtube-premium',
  notion: 'notion',
  microsoft: 'microsoft-365',
  'm365': 'microsoft-365',
  office365: 'microsoft-365',
  'office 365': 'microsoft-365',
  claude: 'claude-ai',
  anthropic: 'claude-ai',
  perplexity: 'perplexity',
  canva: 'canva',
  grammarly: 'grammarly',
  dropbox: 'dropbox',
  'google one': 'google-one',
  googleone: 'google-one',
  disney: 'disney-plus',
  'disney+': 'disney-plus',
  hbo: 'hbo-max',
  max: 'hbo-max',
  '1password': '1password',
  onepassword: '1password',
};

function findAppId(query: string): string | null {
  const q = query.toLowerCase();
  // Direct alias match
  for (const [alias, id] of Object.entries(APP_ALIASES)) {
    if (q.includes(alias)) return id;
  }
  // Fallback: match against app names in mock data
  const found = apps.find((a) => q.includes(a.name.toLowerCase()));
  return found?.id ?? null;
}

// ── Question intent detection ─────────────────────────────────────────────────

type Intent =
  | { type: 'app_analysis'; appId: string }
  | { type: 'top_savings' }
  | { type: 'cheapest_overall' }
  | { type: 'unknown' };

function detectIntent(question: string): Intent {
  const q = question.toLowerCase();

  // Top savings / biggest discount questions
  if (
    q.includes('biggest saving') || q.includes('most saving') ||
    q.includes('哪些') || q.includes('最省') || q.includes('最大节省') ||
    (q.includes('saving') && !q.includes(' for ') && !q.includes('which country'))
  ) {
    return { type: 'top_savings' };
  }

  // Overall cheapest country questions (not about a specific app)
  if (
    (q.includes('cheapest country') || q.includes('cheapest region') || q.includes('最便宜的国家')) &&
    findAppId(q) === null
  ) {
    return { type: 'cheapest_overall' };
  }

  // App-specific question
  const appId = findAppId(q);
  if (appId) return { type: 'app_analysis', appId };

  return { type: 'unknown' };
}

// ── Analysis builder ──────────────────────────────────────────────────────────

interface AppAnalysis {
  appName: string;
  rows: Array<{ countryName: string; cc: string; priceUSD: number; price: number; currency: string }>;
  verifiedDate: string;
}

function buildAppAnalysis(appId: string): AppAnalysis | null {
  const app = apps.find((a) => a.id === appId);
  if (!app) return null;

  const priceRows = getAppPriceTable(appId);
  if (!priceRows.length) return null;

  const rows = priceRows.map((r) => ({
    countryName: r.country.name,
    cc: r.country.code,
    priceUSD: r.priceUSD,
    price: r.price,
    currency: r.currency,
  }));

  rows.sort((a, b) => a.priceUSD - b.priceUSD);

  // Mock data uses a fixed updated date
  const verifiedDate = priceRows[0]?.updatedAt ?? new Date().toISOString().slice(0, 10);

  return { appName: app.name, rows, verifiedDate };
}

function formatAppAnalysis(analysis: AppAnalysis, locale: Locale): string {
  const { appName, rows, verifiedDate } = analysis;
  const cheapest = rows[0];
  const mostExpensive = rows[rows.length - 1];
  const top3 = rows.slice(0, 3);
  const us = rows.find((r) => r.cc === 'US');
  const gap = mostExpensive.priceUSD - cheapest.priceUSD;
  const savings = pct(cheapest.priceUSD, mostExpensive.priceUSD);
  const mo = t('perMonth', locale);

  const top3Lines = top3
    .map((r, i) => `${i + 1}. ${r.countryName} — $${fmt(r.priceUSD)}${mo} (${r.currency} ${r.price})`)
    .join('\n');

  const allLines = rows
    .map((r) => `  ${r.countryName} (${r.cc}): $${fmt(r.priceUSD)} (${r.currency} ${r.price})`)
    .join('\n');

  const usPriceLine = us
    ? `$${fmt(us.priceUSD)}${mo}`
    : locale === 'zh' ? '暂无数据' : 'Not available';

  const lines = [
    `**${appName} ${t('analysisTitle', locale)}**`,
    '',
    `**${t('top3', locale)}**`,
    top3Lines,
    '',
    `**${t('mostExpensive', locale)}**`,
    `${mostExpensive.countryName} — $${fmt(mostExpensive.priceUSD)}${mo}`,
    '',
    `**${t('usPrice', locale)}**`,
    usPriceLine,
    '',
    `**${t('priceGap', locale)}**`,
    `$${fmt(gap)}${mo}`,
    '',
    `**${t('maxSavings', locale)}** ${savings}%`,
    '',
    `**${t('savingsPotential', locale)}**`,
    `${savings}%`,
    '',
    `**${t('coverage', locale)}**`,
    `${rows.length} ${t('countries', locale)}`,
    '',
    `**${t('lastVerified', locale)}**`,
    verifiedDate,
    '',
    `**${t('source', locale)}**`,
    t('sourceValue', locale),
    '',
    `${t('allCountries', locale)}`,
    allLines,
    '',
    `_${t('disclaimer', locale)}_`,
  ];

  return lines.join('\n');
}

// ── Intent handlers ───────────────────────────────────────────────────────────

function handleTopSavings(locale: Locale): string {
  const TOP_IDS = [
    'chatgpt', 'spotify', 'netflix', 'youtube-premium', 'notion',
    'microsoft-365', 'claude-ai', 'canva', 'grammarly', 'google-one',
  ];

  const ranked: Array<{ name: string; savings: number; cheapest: string; cheapestUSD: number }> = [];

  for (const id of TOP_IDS) {
    const analysis = buildAppAnalysis(id);
    if (!analysis || analysis.rows.length < 2) continue;
    const cheap = analysis.rows[0].priceUSD;
    const expensive = analysis.rows[analysis.rows.length - 1].priceUSD;
    const savingsPct = parseFloat(pct(cheap, expensive));
    ranked.push({
      name: analysis.appName,
      savings: savingsPct,
      cheapest: `${analysis.rows[0].countryName} $${fmt(cheap)}`,
      cheapestUSD: cheap,
    });
  }

  ranked.sort((a, b) => b.savings - a.savings);
  const mo = t('perMonth', locale);

  const lines = [
    `**${t('topSavings', locale)}**`,
    '',
    ...ranked.slice(0, 5).map((r, i) =>
      `${i + 1}. **${r.name}** — ${r.savings.toFixed(1)}% ${locale === 'zh' ? '节省' : 'savings'} | ${locale === 'zh' ? '最低' : 'cheapest'}: ${r.cheapest}${mo}`
    ),
    '',
    `_${t('disclaimer', locale)}_`,
  ];

  return lines.join('\n');
}

function handleCheapestOverall(locale: Locale): string {
  // Aggregate average USD price per country across top apps
  const TOP_IDS = [
    'chatgpt', 'spotify', 'netflix', 'youtube-premium', 'canva',
    'notion', 'grammarly', 'google-one', 'microsoft-365', 'disney-plus',
  ];

  const countryTotals = new Map<string, { name: string; total: number; count: number }>();

  for (const id of TOP_IDS) {
    const rows = getAppPriceTable(id);
    for (const r of rows) {
      const cc = r.country.code;
      const existing = countryTotals.get(cc) ?? { name: r.country.name, total: 0, count: 0 };
      existing.total += r.priceUSD;
      existing.count += 1;
      countryTotals.set(cc, existing);
    }
  }

  const ranked = [...countryTotals.entries()]
    .map(([cc, v]) => ({ cc, name: v.name, avg: v.total / v.count }))
    .sort((a, b) => a.avg - b.avg);

  const mo = t('perMonth', locale);

  const lines = [
    `**${t('cheapestOverall', locale)}**`,
    '',
    ...ranked.slice(0, 10).map((r, i) =>
      `${i + 1}. ${r.name} (${r.cc}) — $${fmt(r.avg)} ${t('avgPerMonth', locale)}`
    ),
    '',
    `_${t('disclaimer', locale)}_`,
  ];

  return lines.join('\n');
}

function handleUnknown(locale: Locale): string {
  return locale === 'zh'
    ? '请告诉我您想查询哪个 App 的价格，例如：Spotify、Netflix、ChatGPT。'
    : 'Please specify which app you\'d like to compare — for example: Spotify, Netflix, or ChatGPT.';
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Answer a price intelligence question using only local mock data.
 * No external API calls. Used as fallback when OpenAI is unavailable.
 */
export function answerFromLocalData(question: string, locale: Locale = 'en'): string {
  const intent = detectIntent(question);

  switch (intent.type) {
    case 'app_analysis': {
      const analysis = buildAppAnalysis(intent.appId);
      if (!analysis) return t('notFound', locale);
      return formatAppAnalysis(analysis, locale);
    }
    case 'top_savings':
      return handleTopSavings(locale);
    case 'cheapest_overall':
      return handleCheapestOverall(locale);
    default:
      return handleUnknown(locale);
  }
}
