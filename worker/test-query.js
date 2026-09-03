import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://atzbqvxvlydenkoyokvc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testQuery() {
  const { data, error } = await supabase
    .from('client_keys')
    .select('*, netflix_accounts(email, account_name)')
    .ilike('access_key', 'NF-7821')
    .single();

  if (error) {
    console.error('Error querying key:', error);
  } else {
    console.log('✅ Client Portal Query is WORKING! Client Found:', data);
  }
}

testQuery();
