// Conexão Oficial Supabase - RACE
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://catljaosibqsqexzkrrv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_FLS7sl0xEJ2StmxWfsJQ3Q_y_GiYKoM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
