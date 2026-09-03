import { createClient } from '@supabase/supabase-js';

// Default / Stored config
const getStoredConfig = () => {
  const url = localStorage.getItem('nf_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('nf_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return { url, key };
};

let { url: currentUrl, key: currentKey } = getStoredConfig();

export const isConfigured = () => {
  const { url, key } = getStoredConfig();
  return Boolean(url && key && !url.includes('placeholder') && url.startsWith('http'));
};

export const getSupabaseClient = () => {
  const { url, key } = getStoredConfig();
  if (url && key && url.startsWith('http')) {
    try {
      return createClient(url, key, {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    } catch (e) {
      console.warn('Supabase initialization failed:', e);
    }
  }
  return null;
};

export const saveSupabaseConfig = (url, key) => {
  localStorage.setItem('nf_supabase_url', url.trim());
  localStorage.setItem('nf_supabase_anon_key', key.trim());
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem('nf_supabase_url');
  localStorage.removeItem('nf_supabase_anon_key');
};
