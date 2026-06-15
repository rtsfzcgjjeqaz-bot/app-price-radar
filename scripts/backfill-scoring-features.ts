/**
 * backfill-scoring-features.ts
 *
 * Computes and upserts baseline feature rows for app_features,
 * country_features, and crawl_features from pre-launch data:
 *   apps, plans, countries, current_prices, price_history,
 *   exchange_rates, crawl_jobs, price_observations
 *
 * Also writes a feature_history snapshot for today.
 *
 * Run once after migration 012 is applied, then daily via CI.
 * All upserts are idempotent (ON CONFLICT DO UPDATE).
 *
 * Run: npx tsx scripts/backfill-scoring-features.ts [--dry-run]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const TOTAL_COUNTRIES = 20;
const TOTAL_APPS = 85;
const CONFIDENCE_MAP: Record<string, number> = { high: 2, medium: 1, low: 0 };

function confidenceScore(level: string): number {
  return (CONFIDENCE_MAP[level] ?? 0) / 2 * 100; // map to 0–100
}

function daysSince(ts: string | null | undefined): number {
  if (!ts) return 9999;
  const ms = Date.now() - new Date(ts).getTime();
  return Math.round(ms / 86400000 * 100) / 100;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  if (dryRun) console.log('DRY RUN — queries will run but no data will be written\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date().toISOString().slice(0, 10);

  // ── Load reference data ────────────────────────────────────
  console.log('Loading reference data...');

  const [
    { data: apps },
    { data: countries },
    { data: plans },
    { data: currentPrices },
    { data: exchangeRates },
    { data: priceHistory30d },
    { data: crawlJobs },
    { data: observations },
  ] = await Promise.all([
    supabase.from('apps').select('id, category'),
    supabase.from('countries').select('code, currency'),
    supabase.from('plans').select('id, app_id, billing_period, is_default'),
    supabase.from('current_prices').select(
      'app_id, country_code, plan_id, price, currency, source_type, confidence_level, last_verified_at, updated_at'
    ),
    supabase.from('exchange_rates').select('currency, rate_to_usd, rate_to_cny'),
    supabase.from('price_history').select(
      'app_id, country_code, plan_id, price, currency, snapshot_date, source_type, confidence_level'
    ).gte('snapshot_date', new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10)),
    supabase.from('crawl_jobs').select(
      'id, app_id, country_code, status, retry_count, completed_at, started_at'
    ),
    supabase.from('price_observations').select(
      'app_id, country_code, observation_status, confidence_level, price_delta_pct, observed_at'
    ),
  ]);

  if (!apps || !countries || !currentPrices || !exchangeRates) {
    console.error('Failed to load required reference data');
    process.exit(1);
  }

  // Build lookup maps
  const rateMap = new Map(
    (exchangeRates ?? []).map((r) => [r.currency, { toUSD: Number(r.rate_to_usd), toCNY: Number(r.rate_to_cny) }])
  );
  function toUSD(price: number, currency: string): number {
    const r = rateMap.get(currency);
    return r ? Math.round(price * r.toUSD * 10000) / 10000 : 0;
  }

  // 005_plans.sql backfills plan_id on every current_prices row to the default plan.
  // So filtering plan_id === null returns nothing. We need to treat default-plan rows
  // as the representative "app-level" price per app×country.
  const defaultPlanIds = new Set(
    (plans ?? []).filter((p) => p.is_default).map((p) => p.id)
  );

  // One representative price per app×country: prefer default-plan rows over null-plan rows.
  // Deduplicate so each app×country appears exactly once.
  {
    const _seen = new Set<string>();
    var appLevelPrices = (currentPrices ?? [])
      .filter((p) => p.plan_id === null || defaultPlanIds.has(p.plan_id))
      .sort((a, b) => {
        // non-null plan_id (default plan) sorts first
        const aScore = a.plan_id ? 0 : 1;
        const bScore = b.plan_id ? 0 : 1;
        return aScore - bScore;
      })
      .filter((p) => {
        const key = `${p.app_id}:${p.country_code}`;
        if (_seen.has(key)) return false;
        _seen.add(key);
        return true;
      });
  }

  const planLevelPrices = (currentPrices ?? []).filter(
    (p) => p.plan_id !== null && !defaultPlanIds.has(p.plan_id)
  );

  // ── 1. app_features ────────────────────────────────────────
  console.log('\n[1/4] Computing app_features...');

  const appFeatureRows = (apps ?? []).map((app) => {
    const appPlans = (plans ?? []).filter((p) => p.app_id === app.id);
    const defaultPlan = appPlans.find((p) => p.is_default);

    const myPrices = appLevelPrices.filter((p) => p.app_id === app.id);
    const myPlanPrices = planLevelPrices.filter((p) => p.app_id === app.id);

    const usdPrices = myPrices
      .map((p) => toUSD(Number(p.price), p.currency))
      .filter((v) => v > 0);

    const usPrice = toUSD(
      Number(myPrices.find((p) => p.country_code === 'US')?.price ?? 0),
      myPrices.find((p) => p.country_code === 'US')?.currency ?? 'USD'
    );

    const sourceTypeCounts: Record<string, number> = {};
    for (const p of myPrices) {
      sourceTypeCounts[p.source_type] = (sourceTypeCounts[p.source_type] ?? 0) + 1;
    }
    const totalPrices = myPrices.length;
    const manualSeedCount = sourceTypeCounts['manual_seed'] ?? 0;

    const avgConf = totalPrices > 0
      ? myPrices.reduce((s, p) => s + confidenceScore(p.confidence_level), 0) / totalPrices
      : 0;

    const latestVerified = myPrices
      .map((p) => p.last_verified_at)
      .filter(Boolean)
      .sort()
      .pop();

    const myHistory = (priceHistory30d ?? []).filter((h) => h.app_id === app.id);
    const myJobs = (crawlJobs ?? []).filter((j) => j.app_id === app.id);
    const myObs = (observations ?? []).filter((o) => o.app_id === app.id);

    // Price change detection: compare earliest vs latest history row per country
    let priceChanged30d = false;
    let maxDeltaPct30d = 0;
    const countriesInHistory = [...new Set(myHistory.map((h) => h.country_code))];
    for (const cc of countriesInHistory) {
      const rows = myHistory
        .filter((h) => h.country_code === cc && h.plan_id === null)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      if (rows.length >= 2) {
        const first = toUSD(Number(rows[0].price), rows[0].currency);
        const last = toUSD(Number(rows[rows.length - 1].price), rows[rows.length - 1].currency);
        if (first > 0) {
          const delta = Math.abs((last - first) / first * 100);
          if (delta > 0.5) priceChanged30d = true;
          if (delta > maxDeltaPct30d) maxDeltaPct30d = delta;
        }
      }
    }

    const doneJobs = myJobs.filter((j) => j.status === 'done').length;
    const failedJobs = myJobs.filter((j) => j.status === 'failed').length;
    const successRate = myJobs.length > 0 ? doneJobs / myJobs.length * 100 : 0;

    const verifiedObs = myObs.filter((o) => o.observation_status === 'verified').length;
    const rejectedObs = myObs.filter((o) => o.observation_status === 'rejected').length;
    const rejectRate = myObs.length > 0 ? rejectedObs / myObs.length * 100 : 0;

    return {
      app_id: app.id,
      plan_count: appPlans.length,
      has_default_plan: !!defaultPlan,
      default_billing_period: defaultPlan?.billing_period ?? 'unknown',
      countries_with_price: myPrices.length,
      price_coverage_pct: Math.round(myPrices.length / TOTAL_COUNTRIES * 100 * 100) / 100,
      countries_with_plan_price: new Set(myPlanPrices.map((p) => p.country_code)).size,
      price_usd_us: usPrice > 0 ? usPrice : null,
      price_usd_min: usdPrices.length > 0 ? Math.min(...usdPrices) : null,
      price_usd_max: usdPrices.length > 0 ? Math.max(...usdPrices) : null,
      price_usd_range: usdPrices.length > 0 ? Math.max(...usdPrices) - Math.min(...usdPrices) : null,
      source_type_mix: sourceTypeCounts,
      manual_seed_pct: totalPrices > 0 ? Math.round(manualSeedCount / totalPrices * 100 * 100) / 100 : 0,
      avg_confidence: Math.round(avgConf * 100) / 100,
      days_since_any_verification: daysSince(latestVerified),
      history_row_count: myHistory.length,
      price_changed_30d: priceChanged30d,
      max_delta_pct_30d: Math.round(maxDeltaPct30d * 100) / 100,
      crawl_jobs_total: myJobs.length,
      crawl_jobs_done: doneJobs,
      crawl_jobs_failed: failedJobs,
      crawl_success_rate: Math.round(successRate * 100) / 100,
      observations_total: myObs.length,
      observations_verified: verifiedObs,
      observations_rejected: rejectedObs,
      observation_rejection_rate: Math.round(rejectRate * 100) / 100,
      computed_at: new Date().toISOString(),
    };
  });

  console.log(`  Computed ${appFeatureRows.length} app_features rows`);

  // ── 2. country_features ────────────────────────────────────
  console.log('\n[2/4] Computing country_features...');

  // Build US USD prices per app for savings comparison
  const usPriceByApp = new Map<string, number>();
  for (const p of appLevelPrices.filter((p) => p.country_code === 'US')) {
    const usd = toUSD(Number(p.price), p.currency);
    if (usd > 0) usPriceByApp.set(p.app_id, usd);
  }

  const countryFeatureRows = (countries ?? []).map((country) => {
    const myPrices = appLevelPrices.filter((p) => p.country_code === country.code);
    const er = exchangeRates.find((r) => r.currency === country.currency);

    const usdPrices = myPrices
      .map((p) => ({ appId: p.app_id, usd: toUSD(Number(p.price), p.currency) }))
      .filter((v) => v.usd > 0);

    const avgUSD = usdPrices.length > 0
      ? usdPrices.reduce((s, v) => s + v.usd, 0) / usdPrices.length : null;

    // US avg over the same apps this country covers
    const matchingUSPrices = usdPrices.map((v) => usPriceByApp.get(v.appId) ?? 0).filter((v) => v > 0);
    const usAvgUSD = matchingUSPrices.length > 0
      ? matchingUSPrices.reduce((s, v) => s + v, 0) / matchingUSPrices.length : null;

    const savingsVsUs = usAvgUSD && avgUSD
      ? Math.round((usAvgUSD - avgUSD) / usAvgUSD * 100 * 100) / 100 : 0;

    const appsCheaperThanUs = usdPrices.filter((v) => {
      const usP = usPriceByApp.get(v.appId);
      return usP && v.usd < usP;
    }).length;

    const sourceTypeCounts: Record<string, number> = {};
    for (const p of myPrices) {
      sourceTypeCounts[p.source_type] = (sourceTypeCounts[p.source_type] ?? 0) + 1;
    }
    const totalPrices = myPrices.length;
    const manualSeedCount = sourceTypeCounts['manual_seed'] ?? 0;

    const avgConf = totalPrices > 0
      ? myPrices.reduce((s, p) => s + confidenceScore(p.confidence_level), 0) / totalPrices : 0;

    const latestVerified = myPrices
      .map((p) => p.last_verified_at)
      .filter(Boolean)
      .sort()
      .pop();

    const myHistory = (priceHistory30d ?? []).filter(
      (h) => h.country_code === country.code && h.plan_id === null
    );

    // Price changes: group by app, compare earliest vs latest
    const appIds = [...new Set(myHistory.map((h) => h.app_id))];
    let priceChanges30d = 0;
    let totalDelta = 0;
    let deltaCount = 0;
    for (const appId of appIds) {
      const rows = myHistory
        .filter((h) => h.app_id === appId)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      if (rows.length >= 2) {
        const first = toUSD(Number(rows[0].price), rows[0].currency);
        const last = toUSD(Number(rows[rows.length - 1].price), rows[rows.length - 1].currency);
        if (first > 0) {
          const delta = Math.abs((last - first) / first * 100);
          if (delta > 0.5) priceChanges30d++;
          totalDelta += delta;
          deltaCount++;
        }
      }
    }
    const avgDelta30d = deltaCount > 0 ? Math.round(totalDelta / deltaCount * 100) / 100 : 0;

    // Observation volatility for this country
    const myObs = (observations ?? []).filter((o) => o.country_code === country.code);

    return {
      country_code: country.code,
      apps_with_price: myPrices.length,
      price_coverage_pct: Math.round(myPrices.length / TOTAL_APPS * 100 * 100) / 100,
      avg_price_usd: avgUSD,
      us_avg_price_usd: usAvgUSD,
      savings_vs_us_pct: savingsVsUs,
      apps_cheaper_than_us: appsCheaperThanUs,
      apps_cheaper_pct: myPrices.length > 0
        ? Math.round(appsCheaperThanUs / myPrices.length * 100 * 100) / 100 : 0,
      source_type_mix: sourceTypeCounts,
      manual_seed_pct: totalPrices > 0
        ? Math.round(manualSeedCount / totalPrices * 100 * 100) / 100 : 0,
      avg_confidence: Math.round(avgConf * 100) / 100,
      days_since_any_verification: daysSince(latestVerified),
      history_row_count: myHistory.length,
      price_changes_30d: priceChanges30d,
      avg_delta_pct_30d: avgDelta30d,
      currency: country.currency,
      rate_to_usd: er ? Number(er.rate_to_usd) : null,
      rate_to_cny: er ? Number(er.rate_to_cny) : null,
      computed_at: new Date().toISOString(),
    };
  });

  console.log(`  Computed ${countryFeatureRows.length} country_features rows`);

  // ── 3. crawl_features ──────────────────────────────────────
  console.log('\n[3/4] Computing crawl_features...');

  // Build the set of all app×country pairs from:
  //   1. current_prices (default-plan rows — the main source, ~1,625 pairs)
  //   2. crawl_jobs (one-time paid apps, may already overlap with #1)
  //   3. price_observations (any pair that has ever been observed)
  // Deduplication key: app_id:country_code (crawl_features is one row per pair)
  const pairSet = new Set<string>();
  for (const p of appLevelPrices) pairSet.add(`${p.app_id}:${p.country_code}`);
  for (const j of (crawlJobs ?? [])) pairSet.add(`${j.app_id}:${j.country_code}`);
  for (const o of (observations ?? [])) pairSet.add(`${o.app_id}:${o.country_code}`);

  const crawlFeatureRows = [...pairSet].map((key) => {
    const [appId, countryCode] = key.split(':');

    const myJobs = (crawlJobs ?? []).filter(
      (j) => j.app_id === appId && j.country_code === countryCode
    );
    const doneJobs = myJobs.filter((j) => j.status === 'done');
    const failedJobs = myJobs.filter((j) => j.status === 'failed').length;

    const lastJob = myJobs
      .filter((j) => j.completed_at)
      .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
      .shift();

    const successRate = myJobs.length > 0
      ? Math.round(doneJobs.length / myJobs.length * 100 * 100) / 100 : 0;

    const myObs = (observations ?? []).filter(
      (o) => o.app_id === appId && o.country_code === countryCode
    ).sort((a, b) => b.observed_at.localeCompare(a.observed_at));

    const lastObs = myObs[0];

    const cp = appLevelPrices.find(
      (p) => p.app_id === appId && p.country_code === countryCode
    );

    return {
      app_id: appId,
      country_code: countryCode,
      last_crawl_status: lastJob?.status ?? 'never',
      last_crawl_at: lastJob?.completed_at ?? null,
      days_since_last_crawl: lastJob?.completed_at ? daysSince(lastJob.completed_at) : 9999,
      total_crawl_attempts: myJobs.length,
      successful_crawls: doneJobs.length,
      failed_crawls: failedJobs,
      crawl_success_rate: successRate,
      max_retry_count: myJobs.length > 0 ? Math.max(...myJobs.map((j) => j.retry_count ?? 0)) : 0,
      last_observation_status: lastObs?.observation_status ?? null,
      last_observation_at: lastObs?.observed_at ?? null,
      last_confidence_level: lastObs?.confidence_level ?? null,
      last_price_delta_pct: lastObs?.price_delta_pct != null ? Number(lastObs.price_delta_pct) : null,
      total_observations: myObs.length,
      verified_observations: myObs.filter((o) => o.observation_status === 'verified').length,
      rejected_observations: myObs.filter((o) => o.observation_status === 'rejected').length,
      pending_observations: myObs.filter((o) => o.observation_status === 'pending').length,
      observation_reject_rate: myObs.length > 0
        ? Math.round(
            myObs.filter((o) => o.observation_status === 'rejected').length / myObs.length * 100 * 100
          ) / 100
        : 0,
      has_current_price: !!cp,
      current_source_type: cp?.source_type ?? null,
      current_confidence: cp?.confidence_level ?? null,
      current_last_verified_at: cp?.last_verified_at ?? null,
      days_since_verification: cp?.last_verified_at ? daysSince(cp.last_verified_at) : 9999,
      computed_at: new Date().toISOString(),
    };
  });

  console.log(`  Computed ${crawlFeatureRows.length} crawl_features rows`);

  if (dryRun) {
    console.log('\nDRY RUN complete. No data written.');
    console.log(`  Would upsert: ${appFeatureRows.length} app_features`);
    console.log(`  Would upsert: ${countryFeatureRows.length} country_features`);
    console.log(`  Would upsert: ${crawlFeatureRows.length} crawl_features`);
    console.log(`  Would insert: feature_history snapshots for ${today}`);
    return;
  }

  // ── Write app_features ─────────────────────────────────────
  const BATCH = 100;
  let written = 0;

  for (let i = 0; i < appFeatureRows.length; i += BATCH) {
    const { error } = await supabase
      .from('app_features')
      .upsert(appFeatureRows.slice(i, i + BATCH), { onConflict: 'app_id' });
    if (error) { console.error('app_features upsert error:', error.message); process.exit(1); }
    written += Math.min(BATCH, appFeatureRows.length - i);
  }
  console.log(`\n✓ Upserted ${written} app_features rows`);

  // ── Write country_features ─────────────────────────────────
  written = 0;
  for (let i = 0; i < countryFeatureRows.length; i += BATCH) {
    const { error } = await supabase
      .from('country_features')
      .upsert(countryFeatureRows.slice(i, i + BATCH), { onConflict: 'country_code' });
    if (error) { console.error('country_features upsert error:', error.message); process.exit(1); }
    written += Math.min(BATCH, countryFeatureRows.length - i);
  }
  console.log(`✓ Upserted ${written} country_features rows`);

  // ── Write crawl_features ────────────────────────────────────
  written = 0;
  for (let i = 0; i < crawlFeatureRows.length; i += BATCH) {
    const { error } = await supabase
      .from('crawl_features')
      .upsert(crawlFeatureRows.slice(i, i + BATCH), { onConflict: 'app_id,country_code' });
    if (error) { console.error('crawl_features upsert error:', error.message); process.exit(1); }
    written += Math.min(BATCH, crawlFeatureRows.length - i);
  }
  console.log(`✓ Upserted ${written} crawl_features rows`);

  // ── 4. feature_history snapshots ──────────────────────────
  console.log('\n[4/4] Writing feature_history snapshots...');

  const historyRows: Array<{
    entity_type: string; entity_id: string; snapshot_date: string; features: object;
  }> = [
    ...appFeatureRows.map((r) => ({
      entity_type: 'app',
      entity_id: r.app_id,
      snapshot_date: today,
      features: r,
    })),
    ...countryFeatureRows.map((r) => ({
      entity_type: 'country',
      entity_id: r.country_code,
      snapshot_date: today,
      features: r,
    })),
    ...crawlFeatureRows.map((r) => ({
      entity_type: 'crawl_pair',
      entity_id: `${r.app_id}:${r.country_code}`,
      snapshot_date: today,
      features: r,
    })),
  ];

  let historyWritten = 0;
  for (let i = 0; i < historyRows.length; i += BATCH) {
    const { error } = await supabase
      .from('feature_history')
      .upsert(historyRows.slice(i, i + BATCH), {
        onConflict: 'entity_type,entity_id,snapshot_date',
        ignoreDuplicates: true,
      });
    if (error) { console.error('feature_history upsert error:', error.message); process.exit(1); }
    historyWritten += Math.min(BATCH, historyRows.length - i);
  }
  console.log(`✓ Wrote ${historyWritten} feature_history rows for ${today}`);

  console.log('\n✓ Feature layer baseline complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
