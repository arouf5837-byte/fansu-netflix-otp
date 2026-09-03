// Test Supabase Direct REST API insertion (Simulating Google Apps Script)
async function testRestApi() {
  const url = process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/rest/v1/otp_logs` : 'https://atzbqvxvlydenkoyokvc.supabase.co/rest/v1/otp_logs';
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  const testOtp = Math.floor(1000 + Math.random() * 9000).toString();
  
  const payload = {
    account_id: '4033d05f-3bfe-48ca-b9b4-7324d2771afc',
    otp_code: testOtp,
    action_url: 'https://www.netflix.com/update-primary-location?nftk=gas_test_123',
    email_subject: 'Your Netflix temporary access code',
    email_from: 'info@account.netflix.com',
    raw_snippet: `Your Netflix temporary access code is ${testOtp}. Use this code to sign in.`,
    received_at: new Date().toISOString()
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('✅ Supabase REST API Response:', data);
  } catch (err) {
    console.error('❌ REST API Error:', err);
  }
}

testRestApi();
