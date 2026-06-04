import { supabase } from './client';
import { apps as mockApps } from '@/mock/apps';
import type { App } from '@/types';

export async function getAllApps(): Promise<App[]> {
  if (!supabase) return mockApps;

  const { data, error } = await supabase
    .from('apps')
    .select('id, app_store_id, name, developer, category, icon_url, description')
    .order('name');

  if (error || !data?.length) return mockApps;

  return data.map((r) => ({
    id: r.id,
    appStoreId: r.app_store_id,
    name: r.name,
    developer: r.developer,
    category: r.category,
    iconUrl: r.icon_url,
    description: r.description,
  }));
}

export async function getAppById(id: string): Promise<App | null> {
  if (!supabase) return mockApps.find((a) => a.id === id) ?? null;

  const { data, error } = await supabase
    .from('apps')
    .select('id, app_store_id, name, developer, category, icon_url, description')
    .eq('id', id)
    .single();

  if (error || !data) return mockApps.find((a) => a.id === id) ?? null;

  return {
    id: data.id,
    appStoreId: data.app_store_id,
    name: data.name,
    developer: data.developer,
    category: data.category,
    iconUrl: data.icon_url,
    description: data.description,
  };
}

export async function searchApps(query: string): Promise<App[]> {
  if (!supabase) {
    const q = query.toLowerCase();
    return mockApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }

  const { data, error } = await supabase
    .from('apps')
    .select('id, app_store_id, name, developer, category, icon_url, description')
    .or(`name.ilike.%${query}%,developer.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(20);

  if (error || !data) {
    const q = query.toLowerCase();
    return mockApps.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.developer.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }

  return data.map((r) => ({
    id: r.id,
    appStoreId: r.app_store_id,
    name: r.name,
    developer: r.developer,
    category: r.category,
    iconUrl: r.icon_url,
    description: r.description,
  }));
}
