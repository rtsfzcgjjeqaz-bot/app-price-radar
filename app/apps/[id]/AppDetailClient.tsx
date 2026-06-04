'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/lib/useLocale';
import AppIcon from '@/components/AppIcon';
import PriceTable from '@/components/PriceTable';
import type { App, Plan, PriceRow } from '@/types';

interface Props {
  app: App;
  priceTable: PriceRow[];       // initial prices (default plan or app-level fallback)
  savings: number;              // initial savings % for SSR stats
  usingSupabase: boolean;
  activePlan: Plan | null;      // default plan from server
  allPlans: Plan[];
}

const BILLING_LABELS: Record<string, string> = {
  monthly: '/mo',
  annual: '/yr',
  one_time: ' one-time',
  free: '',
};

function billingLabel(plan: Plan): string {
  if (plan.billingPeriod === 'free') return 'Free';
  if (plan.billingPeriod === 'one_time') return `$${plan.basePriceUsd.toFixed(2)} one-time`;
  return `$${plan.basePriceUsd.toFixed(2)}${BILLING_LABELS[plan.billingPeriod] ?? ''}`;
}

export default function AppDetailClient({
  app, priceTable: initialRows, savings: initialSavings,
  usingSupabase, activePlan, allPlans,
}: Props) {
  const { t } = useLocale();

  const defaultPlanId = activePlan?.id ?? null;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(defaultPlanId);
  const [rows, setRows] = useState<PriceRow[]>(initialRows);
  const [loading, setLoading] = useState(false);

  const selectedPlan = allPlans.find((p) => p.id === selectedPlanId) ?? activePlan;

  // Derive stats from current rows
  const lowest = rows[0];
  const highest = rows[rows.length - 1];
  const savings = highest && lowest && highest.priceUSD > 0
    ? Math.round(((highest.priceUSD - lowest.priceUSD) / highest.priceUSD) * 100)
    : initialSavings;

  const fetchPlanPrices = useCallback(async (planId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${encodeURIComponent(planId)}?appId=${encodeURIComponent(app.id)}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json() as { rows: PriceRow[] };
      setRows(data.rows);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [app.id]);

  // When user switches plan, fetch prices for that plan
  useEffect(() => {
    if (!selectedPlanId || selectedPlanId === defaultPlanId) {
      // default plan — use SSR data
      setRows(initialRows);
      return;
    }
    fetchPlanPrices(selectedPlanId);
  }, [selectedPlanId, defaultPlanId, initialRows, fetchPlanPrices]);

  const showPlanSelector = allPlans.length > 1;
  const hasPlanContext = selectedPlan !== null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* App Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-start gap-5">
          <AppIcon src={app.iconUrl} alt={app.name} size={80} className="w-20 h-20 rounded-2xl shadow-sm shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                {app.category}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-2">{app.developer}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{app.description}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-50">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {lowest ? `$${lowest.priceUSD.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('app_lowest_usd')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 truncate">
              {lowest ? `${lowest.country.flag} ${lowest.country.name}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('app_cheapest_region')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">
              {highest ? `$${highest.priceUSD.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-gray-400">{t('app_highest_usd')}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{savings}%</div>
            <div className="text-xs text-gray-400">{t('app_max_savings')}</div>
          </div>
        </div>
      </div>

      {/* Plan selector — only when there are multiple plans */}
      {showPlanSelector && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 shrink-0">Plan:</span>
            {allPlans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors ${
                    isSelected
                      ? 'bg-[#1a6bff] text-white border-[#1a6bff]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#1a6bff]/40 hover:text-[#1a6bff]'
                  }`}
                >
                  {plan.name}
                  <span className={isSelected ? 'opacity-75' : 'text-gray-400'}>
                    {billingLabel(plan)}
                  </span>
                </button>
              );
            })}
          </div>
          {selectedPlan?.description && (
            <p className="mt-2 text-xs text-gray-400 pl-1">{selectedPlan.description}</p>
          )}
          {selectedPlan?.features && selectedPlan.features.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5 pl-1">
              {selectedPlan.features.map((f) => (
                <span key={f} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {hasPlanContext ? selectedPlan!.name : t('app_global_comparison')}
            {!loading && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({rows.length} {t('app_regions')})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            {hasPlanContext && selectedPlan!.billingPeriod !== 'free' && (
              <span className="text-gray-400">
                {selectedPlan!.billingPeriod === 'one_time' ? 'One-time' : selectedPlan!.billingPeriod.charAt(0).toUpperCase() + selectedPlan!.billingPeriod.slice(1)}
                {' · '}US ${selectedPlan!.basePriceUsd.toFixed(2)}
              </span>
            )}
            {hasPlanContext && <span className="text-gray-200">|</span>}
            <span className="text-gray-400">{t('source_label')}</span>
            {usingSupabase ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('source_supabase')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                {t('source_mock')}
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-gray-200 border-t-[#1a6bff] rounded-full animate-spin" />
            Loading prices…
          </div>
        ) : rows.length > 0 ? (
          <PriceTable rows={rows} />
        ) : (
          <div className="text-center py-14 text-gray-400">
            <div className="text-base font-medium text-gray-500 mb-1">
              No country-level prices available for this plan yet.
            </div>
            <div className="text-sm">
              {usingSupabase
                ? 'Prices for this plan tier have not been seeded into the database.'
                : 'Connect Supabase and seed plan-level prices to enable per-plan comparison.'}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-gray-400 text-center">
        {t('app_disclaimer')} {t('app_data_updated')} {lowest?.updatedAt ?? '—'}
      </p>
    </div>
  );
}
