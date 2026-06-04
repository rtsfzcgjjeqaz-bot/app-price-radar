import {
  findCheapestCountry,
  getAppPricesByCountry,
  getCountryAppPrices,
  getAppRankInCountry,
  compareBundleAcrossCountries,
} from './ranking';
import { countries } from '@/mock/countries';

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}
function formatCNY(n: number) {
  return `¥${n.toFixed(2)}`;
}

export function processMessage(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  // Cheapest country query
  if (msg.includes('cheapest') || msg.includes('最便宜') || msg.includes('lowest price')) {
    const appNames = extractAppNames(msg);
    if (appNames.length === 0) return '请告诉我您想查询哪个 App 的最低价格区域。';

    if (appNames.length > 1) {
      return handleBundle(appNames);
    }

    const result = findCheapestCountry(appNames[0]);
    if (!result) return `当前暂无 "${appNames[0]}" 的价格数据。`;

    const { app, row, savings } = result;
    return (
      `**${app.name}** 全球最低价区域：\n\n` +
      `- 国家/地区：${row.country.flag} ${row.country.name}\n` +
      `- 原币价格：${row.price} ${row.currency}\n` +
      `- 折合 USD：${formatUSD(row.priceUSD)}\n` +
      `- 折合 CNY：${formatCNY(row.priceCNY)}\n` +
      `- 全球排名：第 ${row.rank} / ${row.total} 个区域\n` +
      `- 与最贵区域相比可节省约 ${savings}%\n` +
      `- 数据更新：${row.updatedAt}\n\n` +
      `_以上价格仅供参考，不建议违规切换 App Store 区域。_`
    );
  }

  // Rank query
  if (msg.includes('rank') || msg.includes('排名') || msg.includes('排第几')) {
    const appNames = extractAppNames(msg);
    const countryCode = extractCountryCode(msg);
    if (!appNames.length) return '请告诉我您想查询哪个 App。';
    if (!countryCode) return '请告诉我您想查询哪个国家/地区，例如"美国"或"US"。';

    const result = getAppRankInCountry(appNames[0], countryCode);
    if (!result) return `当前暂无该 App 在 ${countryCode} 区的价格数据。`;

    const { app, row } = result;
    return (
      `**${app.name}** 在 ${row.country.flag} ${row.country.name} 区：\n\n` +
      `- 价格：${row.price} ${row.currency}\n` +
      `- 折合 USD：${formatUSD(row.priceUSD)}\n` +
      `- 折合 CNY：${formatCNY(row.priceCNY)}\n` +
      `- 全球价格排名：第 ${row.rank} / ${row.total}\n` +
      `- 是否全球最低：${row.isLowest ? '是 🏆' : '否'}\n` +
      `- 数据更新：${row.updatedAt}`
    );
  }

  // Bundle across countries
  if (
    msg.includes('total') ||
    msg.includes('bundle') ||
    msg.includes('总价') ||
    msg.includes('哪个国家')
  ) {
    const appNames = extractAppNames(msg);
    if (appNames.length >= 2) {
      return handleBundle(appNames);
    }
  }

  // Country price list
  const countryCode = extractCountryCode(msg);
  if (countryCode && !extractAppNames(msg).length) {
    const result = getCountryAppPrices(countryCode);
    if (!result) return `当前暂无 ${countryCode} 区的价格数据。`;
    const lines = result.items
      .filter((i) => i.app)
      .map((i) => `- **${i.app!.name}**: ${i.price} ${i.currency} (${formatUSD(i.priceUSD)})`)
      .join('\n');
    return `**${result.country.flag} ${result.country.name}** 区 App 价格：\n\n${lines || '暂无数据'}`;
  }

  // General app price
  const appNames = extractAppNames(msg);
  if (appNames.length) {
    const result = getAppPricesByCountry(appNames[0]);
    if (!result) return `当前暂无 "${appNames[0]}" 的价格数据。`;

    const top3 = result.table.slice(0, 3);
    const lines = top3
      .map(
        (r) =>
          `${r.rank}. ${r.country.flag} ${r.country.name} — ${r.price} ${r.currency} (${formatUSD(r.priceUSD)})`
      )
      .join('\n');
    return (
      `**${result.app.name}** 全球最低价 TOP 3：\n\n${lines}\n\n` +
      `共有 ${result.table.length} 个区域有价格数据。\n` +
      `输入"cheapest ${result.app.name}"查看最低价详情。`
    );
  }

  return (
    '您好！我是 App Price Radar 价格助手。\n\n' +
    '您可以问我：\n' +
    '- "ChatGPT 在哪个国家最便宜？"\n' +
    '- "Spotify 在美国排名第几？"\n' +
    '- "我想订阅 ChatGPT 和 Spotify，哪个国家总价最低？"\n' +
    '- "美国有哪些 App？"'
  );
}

function extractAppNames(msg: string): string[] {
  const knownApps = ['chatgpt', 'spotify', 'canva', 'notability', 'procreate', 'duolingo', '1password', 'facetune'];
  return knownApps.filter((name) => msg.includes(name));
}

function extractCountryCode(msg: string): string | null {
  const mapping: Array<[string, string]> = [
    // 中文
    ['美国', 'US'], ['中国', 'CN'], ['日本', 'JP'], ['英国', 'GB'],
    ['德国', 'DE'], ['法国', 'FR'], ['印度', 'IN'], ['土耳其', 'TR'],
    ['巴西', 'BR'], ['墨西哥', 'MX'], ['澳大利亚', 'AU'], ['加拿大', 'CA'],
    ['韩国', 'KR'], ['新加坡', 'SG'], ['香港', 'HK'], ['台湾', 'TW'],
    ['波兰', 'PL'], ['阿根廷', 'AR'], ['埃及', 'EG'], ['俄罗斯', 'RU'],
    // 英文全称（长的先匹配，避免被短词截断）
    ['united states', 'US'], ['united kingdom', 'GB'], ['hong kong', 'HK'],
    ['south korea', 'KR'],
    // 英文单词
    ['america', 'US'], ['china', 'CN'], ['japan', 'JP'],
    ['germany', 'DE'], ['france', 'FR'], ['india', 'IN'],
    ['turkey', 'TR'], ['brazil', 'BR'], ['mexico', 'MX'],
    ['australia', 'AU'], ['canada', 'CA'], ['korea', 'KR'],
    ['singapore', 'SG'], ['taiwan', 'TW'], ['poland', 'PL'],
    ['argentina', 'AR'], ['egypt', 'EG'], ['russia', 'RU'],
    ['uk', 'GB'],
  ];

  for (const [key, code] of mapping) {
    if (msg.includes(key)) return code;
  }

  // 最后尝试匹配独立的两字母国家代码，排除常见英文介词
  const stopWords = new Set(['in', 'at', 'on', 'to', 'of', 'or', 'an', 'is', 'it', 'as', 'be', 'by', 'do', 'go', 'if', 'me', 'my', 'no', 'so', 'up', 'we']);
  const words = msg.match(/\b[a-z]{2}\b/g) ?? [];
  for (const w of words) {
    if (stopWords.has(w)) continue;
    const upper = w.toUpperCase();
    if (countries.find((c) => c.code === upper)) return upper;
  }

  return null;
}

function handleBundle(appNames: string[]): string {
  const result = compareBundleAcrossCountries(appNames);
  if (!result) return '当前暂无相关 App 的价格数据。';

  const { foundApps, notFound, totals } = result;
  const foundNames = foundApps.map((a) => a.name).join('、');
  let reply = `**${foundNames}** 套餐全球总价对比：\n\n`;

  if (notFound.length) {
    reply += `_注：以下 App 暂无数据：${notFound.join('、')}_\n\n`;
  }

  const top5 = totals.slice(0, 5);
  top5.forEach((t, i) => {
    const marker = i === 0 ? ' 🏆 最低' : '';
    reply += `${i + 1}. ${t.country!.flag} ${t.country!.name} — ${formatUSD(t.totalUSD!)}${marker}\n`;
  });

  reply += `\n_仅供参考，不建议违规切换 App Store 区域。_`;
  return reply;
}
