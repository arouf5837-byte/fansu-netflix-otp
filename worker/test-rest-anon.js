async function testRestWithAnon() {
  const url = 'https://atzbqvxvlydenkoyokvc.supabase.co/rest/v1/otp_logs';
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emJxdnh2bHlkZW5rb3lva3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTk4NDgsImV4cCI6MjEwNDAzNTg0OH0.SUmGJ429SW8zNKGUNllRLypbJSni5Q9lQe49cKpazt0';
  
  const payload = {
    account_id: '4033d05f-3bfe-48ca-b9b4-7324d2771afc',
    otp_code: '7830',
    action_url: 'https://www.netflix.com/update-primary-location?nftk=live_verified_123',
    email_subject: 'Netflix: your sign-in code',
    email_from: 'info@account.netflix.com',
    raw_snippet: 'Your Netflix sign-in code is 7830. Enter this code to sign in.',
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
    console.log('Status code:', res.status);
    console.log('🎉 Supabase Insertion SUCCESS:', data);
  } catch (err) {
    console.error('❌ REST API Error:', err);
  }
}

testRestWithAnon();
