import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? '';
const key = process.env.SUPABASE_ANON_KEY ?? '';

// Singleton — null when env vars are absent (falls back to mock data)
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export function isSupabaseAvailable(): boolean {
  return supabase !== null;
}
