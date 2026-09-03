import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { startImapListener, stopAllConnections } from './imap-service.js';
import { parseNetflixEmail } from './parser.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[WARNING] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in worker/.env');
}

const supabase = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_SERVICE_ROLE_KEY || 'placeholder');

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Netflix OTP Worker'
  });
});

// Manual Sync / Re-initialize IMAP connections for all active Netflix accounts in Supabase
app.post('/api/sync-accounts', async (req, res) => {
  try {
    const { data: accounts, error } = await supabase
      .from('netflix_accounts')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    let startedCount = 0;
    for (const acc of accounts || []) {
      if (acc.imap_password) {
        startImapListener(acc, supabase);
        startedCount++;
      }
    }

    res.json({
      success: true,
      message: `Started IMAP listener for ${startedCount} accounts.`,
      accountsCount: (accounts || []).length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Endpoint: Inject a simulated Netflix OTP for easy testing & demo
app.post('/api/test-otp', async (req, res) => {
  try {
    const { account_id, otp_code, action_url, email_subject } = req.body;

    let targetAccountId = account_id;

    // If no account_id provided, pick the first active one
    if (!targetAccountId) {
      const { data: acc } = await supabase.from('netflix_accounts').select('id, email').limit(1).single();
      if (acc) {
        targetAccountId = acc.id;
      } else {
        return res.status(400).json({ success: false, error: 'No Netflix account found in Supabase. Please add one first.' });
      }
    }

    const testCode = otp_code || Math.floor(1000 + Math.random() * 9000).toString();
    const testUrl = action_url || `https://www.netflix.com/update-primary-location?nftk=${Math.random().toString(36).substring(2)}`;
    const testSubject = email_subject || 'Your Netflix temporary access code';

    const { data, error } = await supabase.from('otp_logs').insert({
      account_id: targetAccountId,
      otp_code: testCode,
      action_url: testUrl,
      email_subject: testSubject,
      email_from: 'info@account.netflix.com',
      raw_snippet: `Your Netflix temporary access code is ${testCode}. It will expire in 15 minutes.`,
      received_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Test OTP injected successfully into Supabase!',
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Webhook endpoint (useful for Cloudflare Email Routing or Mailgun)
app.post('/api/webhook/email', async (req, res) => {
  try {
    const { to, from, subject, text, html } = req.body;
    const recipient = (to || '').toLowerCase();

    // Find account by email
    const { data: account } = await supabase
      .from('netflix_accounts')
      .select('id, email')
      .ilike('email', recipient)
      .single();

    if (!account) {
      return res.status(404).json({ error: 'Netflix account not found for this recipient.' });
    }

    const { otpCode, actionUrl, rawSnippet } = parseNetflixEmail(subject, text, html);

    const { data, error } = await supabase.from('otp_logs').insert({
      account_id: account.id,
      otp_code: otpCode,
      action_url: actionUrl,
      email_subject: subject,
      email_from: from,
      raw_snippet: rawSnippet,
      received_at: new Date().toISOString()
    }).select().single();

    if (error) throw error;

    res.json({ success: true, otpCode, actionUrl, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server and start listening
app.listen(PORT, async () => {
  console.log(`=============================================`);
  console.log(`🚀 Netflix OTP Worker running on port ${PORT}`);
  console.log(`=============================================`);

  // Auto connect to configured accounts on startup
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('placeholder')) {
    try {
      const { data: accounts } = await supabase
        .from('netflix_accounts')
        .select('*')
        .eq('is_active', true);

      if (accounts && accounts.length > 0) {
        console.log(`[Worker] Found ${accounts.length} active Netflix accounts. Starting IMAP listeners...`);
        for (const acc of accounts) {
          if (acc.imap_password) {
            startImapListener(acc, supabase);
          }
        }
      } else {
        console.log('[Worker] No accounts found yet. Add accounts via the Admin Dashboard.');
      }
    } catch (e) {
      console.error('[Worker Startup Error]', e.message);
    }
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down IMAP connections...');
  await stopAllConnections();
  process.exit(0);
});
