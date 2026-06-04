import { supabase } from './client';
import { countries as mockCountries } from '@/mock/countries';
import type { Country } from '@/types';

export async function getAllCountries(): Promise<Country[]> {
  if (!supabase) return mockCountries;

  const { data, error } = await supabase
    .from('countries')
    .select('code, name, currency, flag')
    .order('name');

  if (error || !data?.length) return mockCountries;

  return data.map((r) => ({
    code: r.code,
    name: r.name,
    currency: r.currency,
    flag: r.flag,
  }));
}

export async function getCountryByCode(code: string): Promise<Country | null> {
  if (!supabase) return mockCountries.find((c) => c.code === code) ?? null;

  const { data, error } = await supabase
    .from('countries')
    .select('code, name, currency, flag')
    .eq('code', code)
    .single();

  if (error || !data) return mockCountries.find((c) => c.code === code) ?? null;

  return { code: data.code, name: data.name, currency: data.currency, flag: data.flag };
}

export async function searchCountries(query: string): Promise<Country[]> {
  if (!supabase) {
    const q = query.toLowerCase();
    return mockCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q),
    );
  }

  const { data, error } = await supabase
    .from('countries')
    .select('code, name, currency, flag')
    .or(`name.ilike.%${query}%,code.ilike.%${query}%,currency.ilike.%${query}%`)
    .limit(10);

  if (error || !data) {
    const q = query.toLowerCase();
    return mockCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q),
    );
  }

  return data.map((r) => ({
    code: r.code,
    name: r.name,
    currency: r.currency,
    flag: r.flag,
  }));
}
