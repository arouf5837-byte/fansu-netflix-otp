// Mock Data Store for Instant Demo / Testing without requiring immediate DB setup

export const initialMockState = {
  accounts: [
    {
      id: 'acc-1',
      account_name: 'Netflix Premium Master #1',
      email: 'netflix.seller.01@gmail.com',
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      is_active: true,
      last_sync_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 10 * 86400 * 1000).toISOString()
    },
    {
      id: 'acc-2',
      account_name: 'Netflix 4K Ultra #2',
      email: 'reseller.ott.02@gmail.com',
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      is_active: true,
      last_sync_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString()
    }
  ],
  clients: [
    {
      id: 'cli-1',
      account_id: 'acc-1',
      client_name: 'Tanvir Ahmed',
      client_phone: '01712345678',
      access_key: 'NF-7821',
      valid_until: new Date(Date.now() + 25 * 86400 * 1000).toISOString(),
      is_active: true,
      notes: 'Monthly 1-Screen Slot',
      created_at: new Date(Date.now() - 5 * 86400 * 1000).toISOString()
    },
    {
      id: 'cli-2',
      account_id: 'acc-1',
      client_name: 'Rakibul Hasan',
      client_phone: '01898765432',
      access_key: 'NF-9940',
      valid_until: new Date(Date.now() + 14 * 86400 * 1000).toISOString(),
      is_active: true,
      notes: 'Profile 2',
      created_at: new Date(Date.now() - 16 * 86400 * 1000).toISOString()
    },
    {
      id: 'cli-3',
      account_id: 'acc-2',
      client_name: 'Sadia Islam',
      client_phone: '01911223344',
      access_key: 'NF-3310',
      valid_until: new Date(Date.now() + 29 * 86400 * 1000).toISOString(),
      is_active: true,
      notes: 'Living Room TV',
      created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString()
    }
  ],
  otps: [
    {
      id: 'otp-1',
      account_id: 'acc-1',
      otp_code: '4928',
      action_url: 'https://www.netflix.com/update-primary-location?nftk=demo_sample_token_789456',
      email_subject: 'Your Netflix temporary access code',
      email_from: 'info@account.netflix.com',
      raw_snippet: 'Your temporary access code is 4928. Use this code to sign in to Netflix.',
      received_at: new Date(Date.now() - 90 * 1000).toISOString()
    },
    {
      id: 'otp-2',
      account_id: 'acc-2',
      otp_code: '781902',
      action_url: 'https://www.netflix.com/account/travel/verify?token=demo_travel_token_123',
      email_subject: 'Your sign-in code for Netflix',
      email_from: 'info@account.netflix.com',
      raw_snippet: 'Please enter this sign-in code: 781902 to access Netflix.',
      received_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
    }
  ]
};

export const getMockData = () => {
  const stored = localStorage.getItem('nf_mock_data');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return initialMockState;
};

export const saveMockData = (data) => {
  localStorage.setItem('nf_mock_data', JSON.stringify(data));
};
