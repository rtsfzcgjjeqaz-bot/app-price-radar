import { supabase } from './client';
import type { Plan } from '@/types';

export async function getPlansByApp(appId: string): Promise<Plan[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('plans')
    .select('id, app_id, name, billing_period, base_price_usd, is_default, description, features')
    .eq('app_id', appId)
    .order('is_default', { ascending: false })
    .order('base_price_usd', { ascending: true });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    appId: r.app_id,
    name: r.name,
    billingPeriod: r.billing_period,
    basePriceUsd: Number(r.base_price_usd),
    isDefault: r.is_default,
    description: r.description,
    features: r.features ?? [],
  }));
}

export async function getDefaultPlan(appId: string): Promise<Plan | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('plans')
    .select('id, app_id, name, billing_period, base_price_usd, is_default, description, features')
    .eq('app_id', appId)
    .eq('is_default', true)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    appId: data.app_id,
    name: data.name,
    billingPeriod: data.billing_period,
    basePriceUsd: Number(data.base_price_usd),
    isDefault: data.is_default,
    description: data.description,
    features: data.features ?? [],
  };
}

export async function getAllPlans(): Promise<Plan[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('plans')
    .select('id, app_id, name, billing_period, base_price_usd, is_default, description, features')
    .order('app_id')
    .order('is_default', { ascending: false });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    appId: r.app_id,
    name: r.name,
    billingPeriod: r.billing_period,
    basePriceUsd: Number(r.base_price_usd),
    isDefault: r.is_default,
    description: r.description,
    features: r.features ?? [],
  }));
}
