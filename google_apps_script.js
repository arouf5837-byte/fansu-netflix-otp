/**
 * =========================================================================
 * 🎬 Learnory Digital - Netflix OTP Google Apps Script Engine
 * =========================================================================
 * 
 * Instructions:
 * 1. Open Google Apps Script: https://script.google.com/home/start
 * 2. Paste this code into Code.gs
 * 3. Replace ACCOUNT_ID with your specific account ID from Admin Dashboard
 * 4. Click Save (Ctrl + S)
 * 5. Click Triggers (⏰ clock icon on left sidebar) -> Add Trigger
 *    - Choose function: syncNetflixOtpToSupabase
 *    - Event source: Time-driven
 *    - Type: Minutes timer -> Every minute
 * =========================================================================
 */

function syncNetflixOtpToSupabase() {
  const SUPABASE_URL = "https://atzbqvxvlydenkoyokvc.supabase.co/rest/v1/otp_logs";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emJxdnh2bHlkZW5rb3lva3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTk4NDgsImV4cCI6MjEwNDAzNTg0OH0.SUmGJ429SW8zNKGUNllRLypbJSni5Q9lQe49cKpazt0";
  
  // REPLACE THIS WITH THE UNIQUE ACCOUNT ID GENERATED IN LEARNORY ADMIN DASHBOARD:
  const ACCOUNT_ID = "4033d05f-3bfe-48ca-b9b4-7324d2771afc"; // Example: aranyanill584@gmail.com

  // 1. Get ONLY the single newest Netflix email thread
  const threads = GmailApp.search('from:netflix OR subject:Netflix', 0, 1);
  if (!threads || threads.length === 0) return;

  const thread = threads[0];
  const messages = thread.getMessages();
  const msg = messages[messages.length - 1]; // Latest message
  const msgId = msg.getId();

  // 2. Deduplication check: Do not resend already processed email
  const props = PropertiesService.getScriptProperties();
  const lastProcessedId = props.getProperty("LAST_MSG_ID");
  if (lastProcessedId === msgId) {
    return; // Already synced, avoid duplicate clutter
  }

  const subject = msg.getSubject() || "";
  const body = msg.getPlainBody() || "";
  const html = msg.getBody() || "";
  const date = msg.getDate();

  // 3. Check if received in last 20 minutes (Ignore old emails)
  if (new Date() - date > 20 * 60 * 1000) return;

  let otpCode = null;
  const fullText = subject + "\n" + body + "\n" + html;

  // 4. Smart Regex to extract 4, 6 or 8 digits OTP
  const patterns = [
    /(?:sign-in code|access code|temporary access code|code is|is:?|verification code)[\s\S]{0,50}?(\b\d{4,8}\b)/i,
    /<td[^>]*font-size:\s*(?:3[0-9]|4[0-9]|[2-9][0-9])px[^>]*>[\s\S]*?(\b\d{4,8}\b)[\s\S]*?<\/td>/i,
    /font-size:\s*(?:3[0-9]|4[0-9]|[2-9][0-9])px[^>]*>[\s\S]*?(\b\d{4,8}\b)/i,
    /(\b\d{4,6}\b)/
  ];

  for (let i = 0; i < patterns.length; i++) {
    const match = fullText.match(patterns[i]);
    if (match && match[1]) {
      const num = match[1];
      if (num !== '2025' && num !== '2026' && num !== '1000') {
        otpCode = num;
        break;
      }
    }
  }

  // 5. Extract Household / Travel / "Yes, This Was Me" Link
  let actionUrl = null;

  // A. First check <a> tag hrefs in HTML email
  const hrefPatterns = [
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?netflix\.com\/[^"']+)["'][^>]*>[\s\S]*?(?:Yes,\s*This\s*Was\s*Me|Update\s*Netflix\s*Household|Confirm|Verify|Watch\s*Temporarily)/i,
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?netflix\.com\/(?:update-primary-location|account\/travel\/verify|youraccount\/verify|household|manageaccount|nm\/travel|e\/)[^"']+)["']/i,
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?netflix\.com\/[^"']*(?:nftk|token|ticket|auth|code)=[^"']+)["']/i
  ];

  if (html) {
    for (let i = 0; i < hrefPatterns.length; i++) {
      const match = html.match(hrefPatterns[i]);
      if (match && match[1]) {
        actionUrl = match[1].replace(/&amp;/g, '&');
        break;
      }
    }
  }

  // B. Fallback to direct URL regex
  if (!actionUrl) {
    const directUrlPatterns = [
      /https?:\/\/(?:www\.)?netflix\.com\/(?:update-primary-location|account\/travel\/verify|youraccount\/verify|household\/verify|manageaccount\/household|nm\/travel|e\/)[^\s"'<>]+/i,
      /https?:\/\/(?:www\.)?netflix\.com\/[^\s"'<>]+(?:token|nftk|ticket|code|auth)=[^\s"'<>]+/i
    ];
    for (let i = 0; i < directUrlPatterns.length; i++) {
      const match = fullText.match(directUrlPatterns[i]);
      if (match && match[0]) {
        actionUrl = match[0].replace(/&amp;/g, '&');
        break;
      }
    }
  }

  // 6. Post to Supabase REST API
  if (otpCode || actionUrl) {
    console.log("Extracted single latest OTP: " + otpCode);

    const payload = {
      account_id: ACCOUNT_ID,
      otp_code: otpCode,
      action_url: actionUrl,
      email_subject: subject,
      email_from: msg.getFrom(),
      raw_snippet: body.substring(0, 250),
      received_at: date.toISOString()
    };

    const response = UrlFetchApp.fetch(SUPABASE_URL, {
      method: "post",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      // Remember this message ID so it is never duplicated again
      props.setProperty("LAST_MSG_ID", msgId);
      console.log("✅ Successfully saved single latest OTP to Supabase!");
    }
  }
}
