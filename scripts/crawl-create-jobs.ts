/**
 * crawl-create-jobs.ts
 * Populates the crawl_jobs queue with pending work items.
 *
 * Strategy:
 * - One-time paid apps: one job per app×country (20 countries × 5 apps = 100 jobs)
 * - Uses inclusion_scores to assign job priority (higher score = lower priority number = runs first)
 * - Skips jobs that already exist in 'pending' or 'running' state
 * - Skips app×country pairs where source_type = 'manual_seed' (subscription prices are protected)
 *
 * Run: npx tsx scripts/crawl-create-jobs.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// One-time paid apps only — subscriptions are manually curated
const ONE_TIME_PAID: Array<{ id: string; storeId: string }> = [
  { id: 'procreate',       storeId: '364519085'  },
  { id: 'minecraft',       storeId: '479516143'  },
  { id: 'monument-valley', storeId: '728293409'  },
  { id: 'alto-odyssey',    storeId: '1182456409' },
  { id: 'bloons-td6',      storeId: '1118115766' },
];

const COUNTRIES = [
  'US','CN','JP','GB','DE','FR','IN','TR','BR','MX',
  'RU','AU','CA','KR','SG','HK','TW','PL','AR','EG',
];

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch existing pending/running jobs to skip duplicates
  const { data: existingJobs } = await supabase
    .from('crawl_jobs')
    .select('app_id, country_code')
    .in('status', ['pending', 'running']);

  const existingSet = new Set(
    (existingJobs ?? []).map((j) => `${j.app_id}:${j.country_code}`),
  );

  // Fetch inclusion scores for priority assignment
  const { data: scores } = await supabase
    .from('inclusion_scores')
    .select('app_id, country_code, score');

  const scoreMap = new Map(
    (scores ?? []).map((s) => [`${s.app_id}:${s.country_code}`, s.score as number]),
  );

  // Build job rows
  const jobs: Array<{
    app_id: string; country_code: string; plan_id: string | null;
    status: string; priority: number; source: string;
  }> = [];

  for (const app of ONE_TIME_PAID) {
    // Get default plan id for this app
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .eq('app_id', app.id)
      .eq('is_default', true)
      .single();

    for (const cc of COUNTRIES) {
      const key = `${app.id}:${cc}`;
      if (existingSet.has(key)) continue;

      const score = scoreMap.get(key) ?? 50;
      // Convert score (0–100, higher=more important) to priority (1–100, lower=runs first)
      const priority = Math.max(1, Math.round(100 - score));

      jobs.push({
        app_id: app.id,
        country_code: cc,
        plan_id: plan?.id ?? null,
        status: 'pending',
        priority,
        source: 'itunes_lookup',
      });
    }
  }

  if (jobs.length === 0) {
    console.log('No new jobs to create (all already pending/running).');
    return;
  }

  console.log(`Creating ${jobs.length} crawl jobs...`);

  const { error } = await supabase.from('crawl_jobs').insert(jobs);
  if (error) {
    console.error('Insert failed:', error.message);
    process.exit(1);
  }

  console.log(`✓ Created ${jobs.length} crawl jobs`);

  // Print priority breakdown
  const tiers = { high: 0, medium: 0, low: 0 };
  jobs.forEach((j) => {
    if (j.priority <= 33) tiers.high++;
    else if (j.priority <= 66) tiers.medium++;
    else tiers.low++;
  });
  console.log(`  High priority (≤33):   ${tiers.high}`);
  console.log(`  Medium priority (≤66): ${tiers.medium}`);
  console.log(`  Low priority (>66):    ${tiers.low}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
