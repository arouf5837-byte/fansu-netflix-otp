import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { parseNetflixEmail } from './parser.js';

// Active IMAP client instances map (accountId -> ImapFlow instance)
const activeConnections = new Map();

/**
 * Connect to an IMAP mailbox and listen for incoming Netflix emails
 */
export async function startImapListener(account, supabase) {
  if (activeConnections.has(account.id)) {
    console.log(`[IMAP] Already listening for account: ${account.email}`);
    return;
  }

  const client = new ImapFlow({
    host: account.imap_host || 'imap.gmail.com',
    port: account.imap_port || 993,
    secure: true,
    auth: {
      user: account.imap_user || account.email,
      pass: account.imap_password
    },
    logger: false
  });

  activeConnections.set(account.id, client);

  try {
    console.log(`[IMAP] Connecting to ${account.email} (${account.imap_host || 'imap.gmail.com'})...`);
    await client.connect();
    console.log(`[IMAP] Connected successfully to ${account.email}`);

    // Update last sync time in Supabase
    await supabase
      .from('netflix_accounts')
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq('id', account.id);

    // Open INBOX
    const lock = await client.getMailboxLock('INBOX');

    try {
      // Check last unread emails on startup
      await processRecentEmails(client, account, supabase);

      // Listen for new incoming emails
      client.on('exists', async (data) => {
        console.log(`[IMAP] New email received for ${account.email} (Count: ${data.count})`);
        await processNewestEmail(client, account, supabase);
      });

      // Maintain connection with IDLE
      await client.idle();
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`[IMAP Error] Failed for account ${account.email}:`, err.message);
    activeConnections.delete(account.id);

    // Record error in Supabase
    await supabase
      .from('netflix_accounts')
      .update({ last_error: err.message })
      .eq('id', account.id);
  }
}

/**
 * Fetch and process the newest email when a notification arrives
 */
async function processNewestEmail(client, account, supabase) {
  try {
    const mailbox = client.mailbox;
    if (!mailbox || mailbox.exists === 0) return;

    // Fetch the latest message sequence
    const message = await client.fetchOne(mailbox.exists, {
      source: true,
      envelope: true
    });

    if (message && message.source) {
      const parsed = await simpleParser(message.source);
      await handleParsedEmail(parsed, account, supabase);
    }
  } catch (err) {
    console.error(`[IMAP Fetch Error] ${account.email}:`, err.message);
  }
}

/**
 * Process recent 5 unread/latest emails on startup
 */
async function processRecentEmails(client, account, supabase) {
  try {
    const mailbox = client.mailbox;
    if (!mailbox || mailbox.exists === 0) return;

    const startSeq = Math.max(1, mailbox.exists - 4);
    for await (const message of client.fetch(`${startSeq}:${mailbox.exists}`, { source: true, envelope: true })) {
      if (message.source) {
        const parsed = await simpleParser(message.source);
        await handleParsedEmail(parsed, account, supabase);
      }
    }
  } catch (err) {
    console.error(`[IMAP Startup Sync Error] ${account.email}:`, err.message);
  }
}

/**
 * Parse email content and save OTP / link to Supabase
 */
async function handleParsedEmail(parsed, account, supabase) {
  const subject = parsed.subject || '';
  const text = parsed.text || '';
  const html = parsed.html || '';
  const from = parsed.from ? parsed.from.text : '';

  const { otpCode, actionUrl, rawSnippet, isNetflixEmail } = parseNetflixEmail(subject, text, html);

  // If we found an OTP or a Netflix Action URL
  if (otpCode || actionUrl || isNetflixEmail) {
    console.log(`[OTP Detected] Account: ${account.email} | OTP: ${otpCode || 'N/A'} | Link: ${actionUrl ? 'Yes' : 'No'}`);

    // Check if duplicate in last 5 minutes to avoid redundant inserts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('otp_logs')
      .select('id')
      .eq('account_id', account.id)
      .eq('otp_code', otpCode)
      .gte('received_at', fiveMinutesAgo)
      .limit(1);

    if (existing && existing.length > 0 && otpCode) {
      console.log(`[Duplicate Ignored] OTP ${otpCode} already recorded.`);
      return;
    }

    const { error } = await supabase.from('otp_logs').insert({
      account_id: account.id,
      otp_code: otpCode,
      action_url: actionUrl,
      email_subject: subject,
      email_from: from,
      raw_snippet: rawSnippet,
      received_at: new Date().toISOString()
    });

    if (error) {
      console.error('[Supabase Insert Error]', error.message);
    } else {
      console.log(`[Saved to Supabase] OTP/Link recorded successfully for ${account.email}`);
    }
  }
}

/**
 * Disconnect all IMAP connections gracefully
 */
export async function stopAllConnections() {
  for (const [accountId, client] of activeConnections.entries()) {
    try {
      await client.logout();
    } catch (e) {}
    activeConnections.delete(accountId);
  }
}
