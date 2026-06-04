/**
 * Validates every app id that appears on the homepage
 * against mock/apps.ts and the price data.
 *
 * Run: node scripts/validate-app-routes.mjs
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';

// ── Load apps (strip TypeScript annotations via regex) ────────────────────────
const root = path.resolve('.');
const appsRaw = readFileSync(path.join(root, 'mock/apps.ts'), 'utf8');
// Extract all id: '...' values
const idMatches = [...appsRaw.matchAll(/\bid:\s*'([^']+)'/g)];
const appIds = new Set(idMatches.map(m => m[1]));

// ── Load price config ─────────────────────────────────────────────────────────
const priceConfigRaw = readFileSync(path.join(root, 'mock/appPriceConfig.ts'), 'utf8');
const priceIdMatches = [...priceConfigRaw.matchAll(/'([^']+)'\s*:/g)];
const priceIds = new Set(priceIdMatches.map(m => m[1]));

// ── Simulate homepage card selection ─────────────────────────────────────────
// hotApps  = first 4 apps that have price data
// lowPriceApps = first 4 apps sorted by lowest price
// recently updated = first 6 apps

const appsWithPrices = [...appIds].filter(id => priceIds.has(id) && (priceConfigRaw.match(new RegExp(`'${id}'\\s*:\\s*((?!0\\.00)[0-9])`)) !== null));

// hotApps: first 4 with prices
const hotApps = appsWithPrices.slice(0, 4);

// lowPriceApps: sort by base price, take lowest 4 with prices
const appPrices = [];
for (const id of appsWithPrices) {
  const match = priceConfigRaw.match(new RegExp(`'${id}'\\s*:\\s*([0-9.]+)`));
  if (match) appPrices.push({ id, price: parseFloat(match[1]) });
}
appPrices.sort((a, b) => a.price - b.price);
const lowPriceApps = appPrices.slice(0, 4).map(a => a.id);

// recently: first 6 apps in apps.ts order
const allAppsOrdered = idMatches.map(m => m[1]);
const recentApps = allAppsOrdered.slice(0, 6);

// All cards shown on homepage
const homepageCardIds = new Set([...hotApps, ...lowPriceApps, ...recentApps]);

// ── Validate ──────────────────────────────────────────────────────────────────
console.log('\n=== App Route Validation ===\n');
console.log(`Total unique app ids in mock/apps.ts: ${appIds.size}`);
console.log(`App ids with price data: ${appPrices.length}`);
console.log(`Homepage card ids to check: ${homepageCardIds.size}\n`);

const valid = [];
const broken = [];

for (const id of homepageCardIds) {
  const inApps = appIds.has(id);
  const hasPrice = priceIds.has(id);
  const section = [
    hotApps.includes(id) ? 'Popular' : null,
    lowPriceApps.includes(id) ? 'BestValue' : null,
    recentApps.includes(id) ? 'Recent' : null,
  ].filter(Boolean).join(', ');

  if (inApps) {
    valid.push({ id, section });
  } else {
    broken.push({ id, section, inApps, hasPrice });
  }
}

console.log('✅ VALID app ids (exist in mock/apps.ts):');
for (const v of valid) console.log(`   ${v.id.padEnd(22)} [${v.section}]`);

console.log('\n❌ BROKEN app ids (NOT in mock/apps.ts):');
if (broken.length === 0) {
  console.log('   None — all homepage card ids are valid!');
} else {
  for (const b of broken) console.log(`   ${b.id.padEnd(22)} [${b.section}] inApps=${b.inApps}`);
}

// ── Full apps.ts id dump ──────────────────────────────────────────────────────
console.log('\n📋 All app ids in mock/apps.ts:');
console.log([...appIds].map(id => `   ${id}`).join('\n'));

// ── Price config ids not in apps.ts ──────────────────────────────────────────
const orphanPriceIds = [...priceIds].filter(id => !appIds.has(id) && id !== 'apple-arcade');
if (orphanPriceIds.length > 0) {
  console.log('\n⚠️  Price config ids with NO matching app in mock/apps.ts:');
  for (const id of orphanPriceIds) console.log(`   ${id}`);
}
