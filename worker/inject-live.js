import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function injectLiveOtp() {
  const { data: acc } = await supabase.from('netflix_accounts').select('id').eq('email', 'aranyanill584@gmail.com').single();
  if (!acc) return console.log('No account found');

  const randomOtp = Math.floor(1000 + Math.random() * 9000).toString();
  const { data, error } = await supabase.from('otp_logs').insert({
    account_id: acc.id,
    otp_code: randomOtp,
    action_url: `https://www.netflix.com/update-primary-location?nftk=live_test_${Math.random().toString(36).substring(2)}`,
    email_subject: 'Your Netflix temporary access code',
    email_from: 'info@account.netflix.com',
    raw_snippet: `Your temporary access code is ${randomOtp}. Use this code to sign in.`,
    received_at: new Date().toISOString()
  }).select().single();

  if (error) console.error(error);
  else console.log('🎉 Live OTP pushed to Supabase:', data);
}

injectLiveOtp();
