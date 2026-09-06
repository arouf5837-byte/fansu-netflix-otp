import { createClient } from '@supabase/supabase-js';

// Default Production Supabase Configuration for Learnory Digital
const DEFAULT_SUPABASE_URL = 'https://atzbqvxvlydenkoyokvc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emJxdnh2bHlkZW5rb3lva3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTk4NDgsImV4cCI6MjEwNDAzNTg0OH0.SUmGJ429SW8zNKGUNllRLypbJSni5Q9lQe49cKpazt0';

// Default / Stored config
const getStoredConfig = () => {
  const url = localStorage.getItem('nf_supabase_url') || import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem('nf_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
};

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
