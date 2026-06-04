// gen-scores.js — run with: node scripts/gen-scores.js
const fs = require('fs');

const APP_POPULARITY = {
  'chatgpt':90,'spotify':90,'netflix':90,'youtube-premium':88,'amazon-prime':80,'disney-plus':82,
  'claude-ai':82,'perplexity':72,'copilot-ms':70,'midjourney':70,'canva':80,'duolingo':80,
  'notion':75,'microsoft-365':78,'grammarly':72,'adobe-lightroom':70,'dropbox':68,'google-one':70,
  'discord':72,'telegram-premium':65,'strava':65,'calm':65,'capcut':65,
  'todoist':62,'tidal':62,'coinbase':62,'headspace':62,'audible':62,'1password':68,
  'kindle':68,'obsidian':60,'deezer':60,'vsco':60,'masterclass':60,'apple-arcade':60,
  'coursera':60,'apple-tv':70,'hbo-max':75,
  'bear':58,'facetune':58,'mymacros':58,'things3':58,'drafts':55,'babbel':55,
  'luma-ai':55,'pixelmator-pro':55,'fantastical':55,'nordvpn':68,'expressvpn':65,
  'noom':55,'robinhood':58,'scribd':48,'minecraft':78,'roblox':70,'procreate':78,
  'skillshare':55,'ynab':55,'monument-valley':55,'craft':52,'ulysses':52,
  'affinity-photo':52,'affinity-designer':52,'alto-odyssey':50,'whoop':50,
  'day-one':50,'overcast':48,'pocket-casts':48,'halide':48,'lifesum':48,
  'readwise-reader':50,'personal-capital':48,'bloons-td6':45,'darkroom':45,
  'linea-link':42,'ivory':42,'shopify':42,'tripit':38,'working-copy':38,
  'peloton':52,'google-maps':20,'waze':20,'airbnb':30,'proxyman':40,'textsoap':30,
};

const CATEGORY_SCORE = {
  'Productivity':80,'Entertainment':78,'Music':72,'Health & Fitness':70,
  'Education':68,'Finance':65,'Social Networking':65,'Design':62,
  'Photo & Video':60,'Games':60,'Books':58,'Utilities':55,
  'Developer Tools':42,'Navigation':30,'Travel':38,'Business':45,'Lifestyle':50,
};

const BASE_PRICES = {
  'chatgpt':19.99,'notability':11.99,'notion':10.00,'microsoft-365':9.99,'grammarly':12.00,
  'todoist':4.00,'bear':2.99,'things3':9.99,'fantastical':4.99,'ulysses':5.99,'drafts':1.99,
  'obsidian':4.00,'readwise-reader':7.99,'craft':4.99,'perplexity':9.99,'copilot-ms':9.99,
  'claude-ai':9.99,'dropbox':11.99,'google-one':2.99,'spotify':9.99,'tidal':9.99,
  'deezer':9.99,'overcast':9.99,'pocket-casts':3.99,'procreate':12.99,'canva':14.99,
  'pixelmator-pro':13.99,'linea-link':4.99,'affinity-photo':18.99,'affinity-designer':18.99,
  'midjourney':10.00,'facetune':7.99,'adobe-lightroom':9.99,'vsco':29.99,'darkroom':9.99,
  'halide':11.99,'luma-ai':9.99,'capcut':7.99,'netflix':15.49,'youtube-premium':13.99,
  'disney-plus':7.99,'hbo-max':15.99,'amazon-prime':8.99,'apple-tv':9.99,'apple-arcade':6.99,
  'headspace':12.99,'calm':14.99,'strava':11.99,'noom':19.99,'peloton':12.99,'whoop':30.00,
  'mymacros':9.99,'lifesum':5.99,'duolingo':6.99,'babbel':6.99,'masterclass':10.00,
  'skillshare':9.99,'coursera':19.99,'robinhood':5.00,'coinbase':29.99,'ynab':14.99,
  'personal-capital':9.99,'ivory':1.99,'discord':9.99,'telegram-premium':4.99,'1password':2.99,
  'nordvpn':9.99,'expressvpn':12.95,'google-maps':0,'waze':0,'airbnb':0,'tripit':4.99,
  'proxyman':14.99,'working-copy':4.99,'textsoap':4.99,'minecraft':6.99,'roblox':4.99,
  'monument-valley':3.99,'alto-odyssey':4.99,'bloons-td6':4.99,'kindle':9.99,
  'audible':14.95,'scribd':11.99,'shopify':29.00,'day-one':3.99,
};

const BLOCKED_IN = {
  CN:['spotify','netflix','youtube-premium','discord','robinhood','coinbase','nordvpn','expressvpn','roblox','ivory'],
  RU:['spotify','apple-tv'],
};

const raw = fs.readFileSync('mock/apps.ts', 'utf8');
const APP_CATS = {};
const idMatches = [...raw.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
const catMatches = [...raw.matchAll(/category: '([^']+)'/g)].map(m => m[1]);
idMatches.forEach((id, i) => { APP_CATS[id] = catMatches[i]; });

function priceRangeScore(appId) {
  const p = BASE_PRICES[appId] ?? 4.99;
  if (p === 0) return 0;
  return Math.min(100, Math.round((p / 30) * 100));
}
function covScore(appId) {
  let blocked = 0;
  for (const apps of Object.values(BLOCKED_IN)) {
    if (apps.includes(appId)) blocked++;
  }
  return Math.round(((20 - blocked) / 20) * 100);
}
function tier(s) {
  return s >= 80 ? 'critical' : s >= 60 ? 'high' : s >= 40 ? 'medium' : 'low';
}

// ── APP SCORES ────────────────────────────────────────────────
// score = 0.40*popularity + 0.25*category + 0.20*price_range + 0.15*coverage
const appRows = [];
for (const [appId, pop] of Object.entries(APP_POPULARITY)) {
  const cat = APP_CATS[appId] || 'Productivity';
  const catS = CATEGORY_SCORE[cat] || 50;
  const priceS = priceRangeScore(appId);
  const covS = covScore(appId);
  const score = Math.round((0.40*pop + 0.25*catS + 0.20*priceS + 0.15*covS) * 100) / 100;
  appRows.push(`('${appId}',${score},${pop},${catS},${priceS},${covS},'${tier(score)}')`);
}

let appSql = '-- app_scores seed\n-- score = 0.40*popularity + 0.25*category + 0.20*price_range + 0.15*coverage\n\n';
appSql += 'insert into app_scores (app_id, score, popularity_score, category_score, price_range_score, coverage_score, tier) values\n';
appSql += appRows.join(',\n') + '\n';
appSql += 'on conflict (app_id) do update set\n';
appSql += '  score=excluded.score, popularity_score=excluded.popularity_score,\n';
appSql += '  category_score=excluded.category_score, price_range_score=excluded.price_range_score,\n';
appSql += '  coverage_score=excluded.coverage_score, tier=excluded.tier, computed_at=now();\n';
fs.writeFileSync('supabase/seeds/004_app_scores.sql', appSql);

// ── COUNTRY SCORES ────────────────────────────────────────────
// score = 0.35*savings_potential + 0.30*market_size + 0.20*data_quality + 0.15*user_demand
const MULTIPLIERS = {
  US:1.00, GB:1.05, DE:1.08, FR:1.08, AU:1.12, CA:1.10, JP:0.98,
  SG:1.05, HK:0.97, TW:0.80, KR:0.90, CN:0.88, IN:0.28, TR:0.22,
  BR:0.55, MX:0.48, AR:0.12, PL:0.62, RU:0.30, EG:0.20,
};
const MARKET_SIZE = {
  US:95, JP:80, GB:80, CA:75, DE:75, FR:72, AU:70, CN:70,
  KR:65, IN:78, BR:62, SG:62, HK:60, MX:58, TW:58, PL:52,
  TR:55, AR:48, EG:42, RU:40,
};
// Data quality: currency stability (higher = more stable, easier to track accurately)
const DATA_QUALITY = {
  US:95, GB:90, DE:90, FR:90, AU:88, CA:90, JP:85, SG:88,
  HK:85, TW:78, KR:80, CN:75, IN:72, BR:60, MX:65, PL:70,
  TR:40, AR:25, EG:45, RU:35,
};
// User demand: inferred query volume for this country on App Price Radar
const USER_DEMAND = {
  US:95, CN:80, IN:78, JP:75, GB:78, DE:70, BR:65, CA:72,
  AU:68, KR:65, SG:62, HK:60, FR:68, TW:58, MX:55, TR:58,
  PL:50, AR:52, EG:42, RU:38,
};

function savingsPotential(cc) {
  const m = MULTIPLIERS[cc] ?? 1.0;
  const savings = Math.max(0, (1.0 - m) * 100);
  return Math.min(100, Math.round(savings * (100/88)));
}

const ccRows = [];
for (const cc of Object.keys(MULTIPLIERS)) {
  const sp = savingsPotential(cc);
  const ms = MARKET_SIZE[cc] || 50;
  const dq = DATA_QUALITY[cc] || 60;
  const ud = USER_DEMAND[cc] || 50;
  const score = Math.round((0.35*sp + 0.30*ms + 0.20*dq + 0.15*ud) * 100) / 100;
  const t = tier(score);
  const note = sp >= 80 ? 'High savings market' : sp <= 5 ? 'Baseline market' : '';
  ccRows.push(`('${cc}',${score},${sp},${ms},${dq},${ud},'${t}','${note}')`);
}

let ccSql = '-- country_scores seed\n-- score = 0.35*savings_potential + 0.30*market_size + 0.20*data_quality + 0.15*user_demand\n\n';
ccSql += 'insert into country_scores (country_code, score, savings_potential, market_size, data_quality, user_demand, tier, notes) values\n';
ccSql += ccRows.join(',\n') + '\n';
ccSql += 'on conflict (country_code) do update set\n';
ccSql += '  score=excluded.score, savings_potential=excluded.savings_potential,\n';
ccSql += '  market_size=excluded.market_size, data_quality=excluded.data_quality,\n';
ccSql += '  user_demand=excluded.user_demand, tier=excluded.tier,\n';
ccSql += '  notes=excluded.notes, computed_at=now();\n';
fs.writeFileSync('supabase/seeds/005_country_scores.sql', ccSql);

// Print summaries
const appScores = appRows.map(r => {
  const m = r.match(/'([^']+)',([0-9.]+)/);
  return {id:m[1], score:parseFloat(m[2])};
}).sort((a,b)=>b.score-a.score);
console.log('\n=== APP SCORES — Top 10 ===');
appScores.slice(0,10).forEach(a => console.log(` ${a.score.toFixed(2).padStart(6)}  ${a.id}`));
console.log('\n=== APP SCORES — Bottom 5 ===');
appScores.slice(-5).forEach(a => console.log(` ${a.score.toFixed(2).padStart(6)}  ${a.id}`));

const ccScores = ccRows.map(r => {
  const m = r.match(/'([A-Z]{2})',([0-9.]+)/);
  return {cc:m[1], score:parseFloat(m[2])};
}).sort((a,b)=>b.score-a.score);
console.log('\n=== COUNTRY SCORES — All 20 ===');
ccScores.forEach(c => console.log(` ${c.score.toFixed(2).padStart(6)}  ${c.cc}`));
console.log(`\nApp rows: ${appRows.length} | Country rows: ${ccRows.length}`);
