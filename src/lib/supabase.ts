import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // Tenta obter do import.meta.env (Vite)
  const viteKey = `VITE_${key}`;
  const fromVite = (import.meta as any).env?.[viteKey];
  if (fromVite) return fromVite;

  // Tenta obter do process.env (Injetado pelo Vite define ou Node)
  try {
    return (process.env as any)?.[key];
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

if (!supabase) {
  console.warn('Supabase credentials missing. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in the Secrets panel.');
}
