import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testSupabase() {
  const { data, error } = await supabase.from('netflix_accounts').select('*');
  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('✅ Supabase Connection Working! Netflix Accounts:', data);
  }
}

testSupabase();
