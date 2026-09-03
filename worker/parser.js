/**
 * Netflix Email Parser
 * Extracts OTP codes (4-digit, 6-digit, 8-digit) and Action verification URLs (Household / Travel verification)
 */

export function parseNetflixEmail(subject = '', text = '', html = '') {
  const combinedText = `${subject}\n${text}\n${stripHtml(html)}`;
  
  let otpCode = null;
  let actionUrl = null;
  let rawSnippet = '';

  // 1. Regex for OTP / Verification Code (e.g. 4-digit, 6-digit code)
  // Patterns:
  // "Your Netflix temporary access code is 1234"
  // "Your sign-in code: 894321"
  // "Enter this code to sign in: 482910"
  // "Use this code to verify your account: 9482"
  const otpPatterns = [
    /(?:temporary access code|sign-in code|login code|verification code|security code|use this code|code is|is:)\s*[:\-]?\s*([0-9]{4,8})/i,
    /(?:code|কোড)\s*[:\-]?\s*<b>\s*([0-9]{4,8})\s*<\/b>/i,
    /(?:code|কোড)\s*[:\-]?\s*([0-9]{4,8})/i,
    /\b([0-9]{4})\b(?=.*(?:netflix|temporary|access))/i,
    /\b([0-9]{6})\b(?=.*(?:netflix|sign-in|login|verify))/i
  ];

  for (const pattern of otpPatterns) {
    const match = combinedText.match(pattern) || (html && html.match(pattern));
    if (match && match[1]) {
      // Avoid matching years like 2026 or generic 4 digits if not likely
      const code = match[1];
      if (code !== '2024' && code !== '2025' && code !== '2026') {
        otpCode = code;
        break;
      }
    }
  }

  // 2. Regex for Netflix Household Update / Travel verification URL ("Yes, This Was Me" button link)
  // Matches:
  // https://www.netflix.com/update-primary-location?...
  // https://www.netflix.com/account/travel/verify?...
  // https://www.netflix.com/youraccount/verify?...
  // https://www.netflix.com/manageaccount/household/verify?...
  // https://www.netflix.com/e/...
  
  // A. First check <a> tag hrefs containing "Yes, This Was Me" or household keywords
  const hrefPatterns = [
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?netflix\.com\/[^"']+)["'][^>]*>[\s\S]*?(?:Yes,\s*This\s*Was\s*Me|Update\s*Netflix\s*Household|Confirm|Verify|Watch\s*Temporarily)/i,
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?netflix\.com\/(?:update-primary-location|account\/travel\/verify|youraccount\/verify|household|manageaccount|nm\/travel|e\/)[^"']+)["']/i,
    /<a[^>]+href=["'](https?:\/\/(?:www\.)?netflix\.com\/[^"']*(?:nftk|token|ticket|auth|code)=[^"']+)["']/i
  ];

  if (html) {
    for (const pattern of hrefPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        actionUrl = match[1].replace(/&amp;/g, '&');
        break;
      }
    }
  }

  // B. Fallback to direct URL regex in text and HTML
  if (!actionUrl) {
    const directUrlPatterns = [
      /https?:\/\/(?:www\.)?netflix\.com\/(?:update-primary-location|account\/travel\/verify|youraccount\/verify|household\/verify|manageaccount\/household|nm\/travel|e\/)[^\s"'<>]+/i,
      /https?:\/\/(?:www\.)?netflix\.com\/[^\s"'<>]+(?:token|nftk|ticket|code|auth)=[^\s"'<>]+/i,
      /https?:\/\/[^\s"'<>]*(?:netflix)[^\s"'<>]+(?:verify|household|location|update)[^\s"'<>]+/i
    ];

    const fullContent = `${html}\n${combinedText}`;
    for (const pattern of directUrlPatterns) {
      const match = fullContent.match(pattern);
      if (match && match[0]) {
        actionUrl = match[0].replace(/&amp;/g, '&');
        break;
      }
    }
  }

  // Generate a clean summary snippet
  rawSnippet = (text || stripHtml(html)).trim().slice(0, 300);

  return {
    otpCode,
    actionUrl,
    rawSnippet,
    isNetflixEmail: isLikelyNetflixEmail(subject, text, html)
  };
}

function stripHtml(html = '') {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyNetflixEmail(subject = '', text = '', html = '') {
  const content = `${subject} ${text} ${html}`.toLowerCase();
  return (
    content.includes('netflix') ||
    content.includes('temporary access') ||
    content.includes('household') ||
    content.includes('sign-in code') ||
    content.includes('primary location')
  );
}
