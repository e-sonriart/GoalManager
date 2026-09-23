import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'cf_supabase_url';
const SUPABASE_ANON_KEY = 'cf_supabase_anon_key';

// Fallback público (anon key by design). Prioridad: localStorage > env > estos valores.
const FALLBACK_URL = 'https://fycfljwckpflderfddgy.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5Y2Zsandja3BmbGRlcmZkZGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNzE0MzMsImV4cCI6MjEwNTc0NzQzM30.PW75GFSrD7v0KgKWyhjaL6k_Po_OyJ5TTY-ABXXZdtM';

export const getSupabaseUrl = (): string => {
  return (
    localStorage.getItem(SUPABASE_URL_KEY) ||
    (import.meta.env.VITE_SUPABASE_URL as string) ||
    FALLBACK_URL
  );
};

export const getSupabaseAnonKey = (): string => {
  return (
    localStorage.getItem(SUPABASE_ANON_KEY) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    FALLBACK_ANON_KEY
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
