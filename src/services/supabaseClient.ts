import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'cf_supabase_url';
const SUPABASE_ANON_KEY = 'cf_supabase_anon_key';

export const getSupabaseUrl = (): string => {
  return (
    localStorage.getItem(SUPABASE_URL_KEY) ||
    (import.meta.env.VITE_SUPABASE_URL as string) ||
    ''
  );
};

export const getSupabaseAnonKey = (): string => {
  return (
    localStorage.getItem(SUPABASE_ANON_KEY) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    ''
  );
};

export const setSupabaseConfig = (url: string, anonKey: string): void => {
  if (url) localStorage.setItem(SUPABASE_URL_KEY, url.trim());
  if (anonKey) localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
};

let client: SupabaseClient | null = null;
let clientUrl = '';
let clientKey = '';

export const getSupabase = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;
  if (!client || clientUrl !== url || clientKey !== key) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    clientUrl = url;
    clientKey = key;
  }
  return client;
};

export const isSupabaseConfigured = (): boolean => Boolean(getSupabaseUrl() && getSupabaseAnonKey());
