import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Key, 
  Lock, 
  RefreshCw, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  Mail,
  FileCode,
  X,
  Filter,
  Settings
} from 'lucide-react';
import { isConfigured, getSupabaseClient } from '../supabaseClient';
import { getMockData, saveMockData } from '../mockData';

const createClientForm = () => ({
  client_name: '',
  client_phone: '',
  access_key: `NF-${Math.floor(1000 + Math.random() * 9000)}`,
  account_id: '',
  durationDays: '30',
});

export default function AdminDashboard({ onOpenSettings }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('nf_admin_auth') === 'true';
  });
  const [adminPin, setAdminPin] = useState('');
  const [authError, setAuthError] = useState('');

  // Tabs: 'clients' | 'accounts'
  const [activeTab, setActiveTab] = useState('clients');

  // Selected Account filter for OTP Monitor
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('all');

  // State
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [allOtps, setAllOtps] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [scriptModalAccount, setScriptModalAccount] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);
  const [testOtpStatus, setTestOtpStatus] = useState('');

  // Form states
  const [newClient, setNewClient] = useState(createClientForm);

  const [newAccount, setNewAccount] = useState({
    account_name: '',
    email: ''
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPin === '0549' || adminPin === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('nf_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('ভুল পিন কোড! সঠিক পিন প্রদান করুন।');
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    if (isConfigured()) {
      const supabase = getSupabaseClient();
      try {
        const [accRes, cliRes, otpRes] = await Promise.all([
          supabase.from('netflix_accounts').select('*').order('created_at', { ascending: false }),
          supabase.from('client_keys').select('*, netflix_accounts(email, account_name)').order('created_at', { ascending: false }),
          supabase.from('otp_logs').select('*, netflix_accounts(email, account_name)').order('received_at', { ascending: false }).limit(20)
        ]);

        if (accRes.data) {
          setAccounts(accRes.data);
          if (accRes.data.length > 0 && !newClient.account_id) {
            setNewClient(prev => ({ ...prev, account_id: accRes.data[0].id }));
          }
        }
        if (cliRes.data) setClients(cliRes.data);
        if (otpRes.data) setAllOtps(otpRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    } else {
      const mock = getMockData();
      setAccounts(mock.accounts);
      setClients(mock.clients);
      setAllOtps(mock.otps);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Create Client
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClient.client_name || !newClient.access_key) return;

    const validUntil = newClient.durationDays === 'lifetime' 
      ? null 
      : new Date(Date.now() + parseInt(newClient.durationDays) * 86400 * 1000).toISOString();

    const targetAccountId = newClient.account_id || accounts[0]?.id || null;

    const payload = {
      client_name: newClient.client_name,
      client_phone: newClient.client_phone,
      access_key: newClient.access_key.trim().toUpperCase(),
      account_id: targetAccountId,
      valid_until: validUntil,
      is_active: true
    };

    if (isConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('client_keys')
        .insert([payload])
        .select('*, netflix_accounts(email, account_name)')
        .single();

      if (!error && data) {
        setClients([data, ...clients]);
        setShowAddClient(false);
        setNewClient({ ...createClientForm(), account_id: accounts[0]?.id || '' });
      } else {
        alert('ত্রুটি: ' + (error?.message || 'Error'));
      }
    } else {
      const mock = getMockData();
      const account = mock.accounts.find(a => a.id === targetAccountId);
      const created = { id: `cli-${Date.now()}`, ...payload, netflix_accounts: account, created_at: new Date().toISOString() };
      mock.clients.unshift(created);
      saveMockData(mock);
      setClients([...mock.clients]);
      setShowAddClient(false);
    }
  };

  // Create Netflix Account & immediately open Google Script popup
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.account_name || !newAccount.email) return;

    if (isConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('netflix_accounts')
        .insert([{
          account_name: newAccount.account_name,
          email: newAccount.email.trim().toLowerCase(),
          is_active: true
        }])
        .select()
        .single();

      if (!error && data) {
        setAccounts([data, ...accounts]);
        setShowAddAccount(false);
        setNewAccount({ account_name: '', email: '' });
        setScriptModalAccount(data);
      } else {
        alert('ত্রুটি: ' + (error?.message || 'Error'));
      }
    } else {
      const mock = getMockData();
      const created = {
        id: `acc-${Date.now()}`,
        account_name: newAccount.account_name,
        email: newAccount.email.trim().toLowerCase(),
        is_active: true,
        created_at: new Date().toISOString()
      };
      mock.accounts.unshift(created);
      saveMockData(mock);
      setAccounts([...mock.accounts]);
      setShowAddAccount(false);
      setNewAccount({ account_name: '', email: '' });
      setScriptModalAccount(created);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!confirm('আপনি কি এই ক্লায়েন্ট কি মুছে ফেলতে চান?')) return;
    if (isConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.from('client_keys').delete().eq('id', id);
      setClients(clients.filter(c => c.id !== id));
    } else {
      const mock = getMockData();
      mock.clients = mock.clients.filter(c => c.id !== id);
      saveMockData(mock);
      setClients([...mock.clients]);
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!confirm('আপনি কি এই নেটফ্লিক্স অ্যাকাউন্টটি ডিলিট করতে চান? এর সাথে থাকা সকল ক্লায়েন্ট কি ডিলিট হয়ে যাবে।')) return;
    if (isConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.from('netflix_accounts').delete().eq('id', id);
      setAccounts(accounts.filter(a => a.id !== id));
    } else {
      const mock = getMockData();
      mock.accounts = mock.accounts.filter(a => a.id !== id);
      saveMockData(mock);
      setAccounts([...mock.accounts]);
    }
  };

  const handleCopyWhatsAppLink = (key) => {
    const origin = window.location.origin + window.location.pathname;
    const shareableUrl = `${origin}?key=${key}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Smart Deduplicating Google Apps Script Code Generator
  const generateGoogleScriptCode = (account) => {
    const url = 'https://atzbqvxvlydenkoyokvc.supabase.co/rest/v1/otp_logs';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0emJxdnh2bHlkZW5rb3lva3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTk4NDgsImV4cCI6MjEwNDAzNTg0OH0.SUmGJ429SW8zNKGUNllRLypbJSni5Q9lQe49cKpazt0';
    const accountId = account?.id || '4033d05f-3bfe-48ca-b9b4-7324d2771afc';

    return `function syncNetflixOtpToSupabase() {
  const SUPABASE_URL = "${url}";
  const SUPABASE_KEY = "${anonKey}";
  const ACCOUNT_ID = "${accountId}"; // Linked to: ${account?.email || ''}

  // Get only the single newest Netflix email thread
  const threads = GmailApp.search('from:netflix OR subject:Netflix', 0, 1);
  if (!threads || threads.length === 0) return;

  const thread = threads[0];
  const messages = thread.getMessages();
  const msg = messages[messages.length - 1]; // Latest message
  const msgId = msg.getId();

  // Deduplication check: Do not resend already processed email
  const props = PropertiesService.getScriptProperties();
  const lastProcessedId = props.getProperty("LAST_MSG_ID");
  if (lastProcessedId === msgId) {
    return; // Already synced, avoid duplicate clutter
  }

  const subject = msg.getSubject() || "";
  const body = msg.getPlainBody() || "";
  const html = msg.getBody() || "";
  const date = msg.getDate();

  // Check if received in last 20 minutes
  if (new Date() - date > 20 * 60 * 1000) return;

  let otpCode = null;
  const fullText = subject + "\\n" + body + "\\n" + html;

  // Smart Regex to extract 4, 6 or 8 digits
  const patterns = [
    /(?:sign-in code|access code|temporary access code|code is|is:?|verification code)[\\s\\S]{0,50}?(\\b\\d{4,8}\\b)/i,
    /<td[^>]*font-size:\\s*(?:3[0-9]|4[0-9]|[2-9][0-9])px[^>]*>[\\s\\S]*?(\\b\\d{4,8}\\b)[\\s\\S]*?<\\/td>/i,
    /font-size:\\s*(?:3[0-9]|4[0-9]|[2-9][0-9])px[^>]*>[\\s\\S]*?(\\b\\d{4,8}\\b)/i,
    /(\\b\\d{4,6}\\b)/
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

  // Extract Household / Travel / "Yes, This Was Me" Link
  let actionUrl = null;

  // A. First check <a> tag hrefs in HTML email
  const hrefPatterns = [
    /<a[^>]+href=["'](https?:\\/\\/(?:www\\.)?netflix\\.com\\/[^"']+)["'][^>]*>[\\s\\S]*?(?:Yes,\\s*This\\s*Was\\s*Me|Update\\s*Netflix\\s*Household|Confirm|Verify|Watch\\s*Temporarily)/i,
    /<a[^>]+href=["'](https?:\\/\\/(?:www\\.)?netflix\\.com\\/(?:update-primary-location|account\\/travel\\/verify|youraccount\\/verify|household|manageaccount|nm\\/travel|e\\/)[^"']+)["']/i,
    /<a[^>]+href=["'](https?:\\/\\/(?:www\\.)?netflix\\.com\\/[^"']*(?:nftk|token|ticket|auth|code)=[^"']+)["']/i
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
      /https?:\\/\\/(?:www\\.)?netflix\\.com\\/(?:update-primary-location|account\\/travel\\/verify|youraccount\\/verify|household\\/verify|manageaccount\\/household|nm\\/travel|e\\/)[^\\s"'<>]+/i,
      /https?:\\/\\/(?:www\\.)?netflix\\.com\\/[^\\s"'<>]+(?:token|nftk|ticket|code|auth)=[^\\s"'<>]+/i
    ];
    for (let i = 0; i < directUrlPatterns.length; i++) {
      const match = fullText.match(directUrlPatterns[i]);
      if (match && match[0]) {
        actionUrl = match[0].replace(/&amp;/g, '&');
        break;
      }
    }
  }

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
      console.log("✅ Successfully saved single latest OTP / TV Link to Supabase!");
    }
  }
}`;
  };

  const handleCopyScript = (account) => {
    const code = generateGoogleScriptCode(account);
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Test OTP injection
  const handleTestOtp = async () => {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    setTestOtpStatus('পাঠানো হচ্ছে...');
    const targetAccountId = (selectedAccountFilter !== 'all' ? selectedAccountFilter : accounts[0]?.id) || null;

    if (isConfigured()) {
      const supabase = getSupabaseClient();
      const { data } = await supabase.from('otp_logs').insert({
        account_id: targetAccountId,
        otp_code: randomCode,
        action_url: `https://www.netflix.com/update-primary-location?nftk=test_${Math.random().toString(36).substring(2)}`,
        email_subject: 'Netflix: your sign-in code',
        email_from: 'info@account.netflix.com',
        raw_snippet: `Your Netflix sign-in code is ${randomCode}.`,
        received_at: new Date().toISOString()
      }).select('*, netflix_accounts(email, account_name)').single();

      if (data) {
        setAllOtps([data, ...allOtps]);
        setTestOtpStatus(`✅ টেস্ট ওটিপি ${randomCode} তৈরি হয়েছে!`);
      }
    } else {
      const mock = getMockData();
      const targetAcc = accounts.find(a => a.id === targetAccountId) || accounts[0];
      const newOtp = {
        id: `otp-${Date.now()}`,
        account_id: targetAccountId,
        otp_code: randomCode,
        email_subject: 'Netflix: your sign-in code',
        received_at: new Date().toISOString(),
        netflix_accounts: targetAcc
      };
      mock.otps.unshift(newOtp);
      saveMockData(mock);
      setAllOtps([newOtp, ...allOtps]);
      setTestOtpStatus(`✅ টেস্ট ওটিপি ${randomCode} তৈরি হয়েছে!`);
    }
    setTimeout(() => setTestOtpStatus(''), 3000);
  };

  const filteredOtps = selectedAccountFilter === 'all' 
    ? allOtps 
    : allOtps.filter(o => o.account_id === selectedAccountFilter);
  
  const currentDisplayedOtp = filteredOtps[0] || null;

  if (!isAuthenticated) {
    return (
      <div className="w-full flex justify-center py-20 px-4">
        <div className="saas-card-elevated max-w-sm w-full p-8 text-center space-y-5 animate-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-[#e50914] shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Authentication</h2>
            <p className="text-xs text-slate-500 font-medium">অ্যাডমিন প্যানেলে প্রবেশ করতে ৪ ডিজিটের পিন লিখুন</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="••••"
              className="input-saas text-center text-2xl tracking-[0.3em] font-mono font-black py-3.5 placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-300"
              autoFocus
            />
            {authError && <p className="text-xs text-red-600 font-bold animate-fade-up">{authError}</p>}
            <button type="submit" className="btn-primary-netflix w-full py-3.5 text-sm font-extrabold shadow-md">
              প্রবেশ করুন
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-8 sm:py-14 px-4 sm:px-6">
      <div className="w-full max-w-4xl mx-auto space-y-7 animate-fade-up">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-[#e50914]">
                <Shield className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Operations</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              গ্রাহক, Netflix account ও সর্বশেষ verification এক জায়গায় পরিচালনা করুন।
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={onOpenSettings} className="btn-secondary-saas text-xs py-2 px-3" title="Database settings" aria-label="Database settings">
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={handleTestOtp}
              className="btn-secondary-saas text-xs py-2 px-3.5 bg-amber-50 border-amber-200 text-amber-900 font-bold"
              title="Test OTP Injection"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Test OTP</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn-secondary-saas text-xs py-2 px-3"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#e50914]' : 'text-slate-600'}`} />
            </button>
          </div>
        </div>

        {testOtpStatus && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fade-up shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{testOtpStatus}</span>
          </div>
        )}

        {/* SINGLE RECENT OTP WIDGET WITH GMAIL ACCOUNT FILTER */}
        <div className="saas-card-elevated p-6 sm:p-7 border-l-4 border-l-[#e50914] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="badge-shimmer text-[#e50914] font-extrabold text-[11px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                Recent OTP Monitor
              </span>
              <span className="text-xs sm:text-sm text-slate-600 font-semibold">ফিল্টার করে যেকোনো Gmail-এর কোড দেখুন:</span>
            </div>

            {/* Account Filter Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedAccountFilter}
                onChange={(e) => setSelectedAccountFilter(e.target.value)}
                className="input-saas text-xs py-2 px-3 bg-slate-50 border-slate-300 font-mono font-bold"
              >
                <option value="all">সবগুলো Gmail (All Accounts)</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} ({acc.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
                <span>অ্যাকাউন্ট: <strong className="text-slate-900 font-mono font-bold">{currentDisplayedOtp?.netflix_accounts?.email || accounts.find(a => a.id === currentDisplayedOtp?.account_id)?.email || 'N/A'}</strong></span>
                {currentDisplayedOtp?.received_at && (
                  <span className="flex items-center gap-1 font-mono text-slate-500">
                    • <Clock className="w-3.5 h-3.5" /> {new Date(currentDisplayedOtp.received_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="font-mono text-4xl sm:text-5xl font-black text-slate-950 tracking-wider">
                {currentDisplayedOtp?.otp_code || 'কোনো ওটিপি নেই'}
              </div>
            </div>

            {currentDisplayedOtp?.action_url && (
              <a
                href={currentDisplayedOtp.action_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary-saas text-xs sm:text-sm py-2.5 px-4 text-blue-700 bg-blue-50 border-blue-200 self-start sm:self-center flex items-center gap-2 font-bold"
              >
                <span>Household Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('clients')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === 'clients' ? 'bg-[#e50914] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>গ্রাহকদের Access Key ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 ${
              activeTab === 'accounts' ? 'bg-[#e50914] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Netflix Master Accounts ({accounts.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: CLIENT ACCESS KEYS ================= */}
        {activeTab === 'clients' && (
          <div className="saas-card p-6 sm:p-7 space-y-5 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">গ্রাহকদের তালিকা ও তাদের অ্যাক্সেস লিঙ্ক</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">প্রতিটি গ্রাহক শুধুমাত্র তার নির্দিষ্ট জিমেইলের ওটিপি দেখতে পাবে</p>
              </div>
              <button
                onClick={() => setShowAddClient(true)}
                className="btn-primary-netflix text-xs sm:text-sm py-2.5 px-4 font-bold self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন গ্রাহক যোগ করুন</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider bg-slate-50">
                    <th className="py-3 px-4">গ্রাহকের নাম</th>
                    <th className="py-3 px-4">Access Key</th>
                    <th className="py-3 px-4">এসাইন করা Netflix Gmail</th>
                    <th className="py-3 px-4">মেয়াদ</th>
                    <th className="py-3 px-4 text-right">লিঙ্ক কপি</th>
                    <th className="py-3 px-4 text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-500 text-xs sm:text-sm font-medium">
                        কোনো গ্রাহক যোগ করা হয়নি। "নতুন গ্রাহক যোগ করুন" বাটনে চাপ দিন।
                      </td>
                    </tr>
                  ) : (
                    clients.map((cli) => (
                      <tr key={cli.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {cli.client_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-emerald-700">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80">
                            {cli.access_key}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700 font-mono font-medium">
                          {cli.netflix_accounts?.email || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                          {cli.valid_until ? new Date(cli.valid_until).toLocaleDateString() : 'লাইফটাইম'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleCopyWhatsAppLink(cli.access_key)}
                            className="btn-secondary-saas text-xs py-1.5 px-3 inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold"
                            title="Copy WhatsApp Link"
                          >
                            {copiedKey === cli.access_key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedKey === cli.access_key ? 'Copied' : 'WhatsApp Link'}</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteClient(cli.id)}
                            className="btn-icon p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Client"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MULTI-GMAIL NETFLIX ACCOUNTS ================= */}
        {activeTab === 'accounts' && (
          <div className="saas-card p-6 sm:p-7 space-y-5 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Netflix Master Accounts</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">যেকোনো জিমেইল যুক্ত করে তার জন্য ১-ক্লিকে রেডিমেড Google Script কপি করুন</p>
              </div>
              <button
                onClick={() => setShowAddAccount(true)}
                className="btn-primary-netflix text-xs sm:text-sm py-2.5 px-4 font-bold self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন Gmail যোগ করুন</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 relative hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">{acc.account_name}</h4>
                      <p className="text-xs font-mono text-slate-600 font-medium mt-0.5">{acc.email}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="btn-icon p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">ID: {acc.id.substring(0, 8)}...</span>
                    
                    <button
                      onClick={() => setScriptModalAccount(acc)}
                      className="btn-primary-netflix text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-xs"
                    >
                      <FileCode className="w-4 h-4" />
                      <span>Google Script কোড</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= MODAL: 1-CLICK GOOGLE SCRIPT ================= */}
        {scriptModalAccount && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="saas-card-elevated max-w-2xl w-full p-6 sm:p-8 space-y-5 animate-fade-up relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setScriptModalAccount(null)}
                className="absolute right-5 top-5 btn-icon p-2 text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-[#e50914]">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    Google Apps Script ({scriptModalAccount.account_name})
                  </h3>
                  <p className="text-xs text-slate-600 font-mono font-medium">জিমেইল: {scriptModalAccount.email}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm text-slate-700 font-medium">
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#e50914] text-white flex items-center justify-center text-xs">১</span>
                  <strong>{scriptModalAccount.email}</strong> জিমেইলে <a href="https://script.google.com/home/start" target="_blank" rel="noreferrer" className="text-blue-600 underline">script.google.com</a>-এ যান।
                </p>
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#e50914] text-white flex items-center justify-center text-xs">২</span>
                  নিচের কোডটি পেস্ট করে Save করুন।
                </p>
                <p className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#e50914] text-white flex items-center justify-center text-xs">৩</span>
                  বামপাশের <strong>Triggers (⏰)</strong> এ গিয়ে <strong>Every minute</strong> টাইমার চালু করুন।
                </p>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] sm:text-xs text-emerald-400 overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                  {generateGoogleScriptCode(scriptModalAccount)}
                </pre>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleCopyScript(scriptModalAccount)}
                  className={`btn-primary-netflix flex-1 text-sm py-3 font-extrabold ${
                    copiedScript ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : ''
                  }`}
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'কোড কপি হয়েছে!' : 'সম্পূর্ণ স্ক্রিপ্ট কোড কপি করুন'}</span>
                </button>
                <button
                  onClick={() => setScriptModalAccount(null)}
                  className="btn-secondary-saas text-sm py-3 px-5 font-bold"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD CLIENT ================= */}
        {showAddClient && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="saas-card-elevated max-w-sm w-full p-6 sm:p-7 space-y-4 animate-fade-up">
              <h3 className="text-lg font-black text-slate-900">নতুন গ্রাহকের Access Key তৈরি করুন</h3>
              <form onSubmit={handleCreateClient} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">গ্রাহকের নাম</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    value={newClient.client_name}
                    onChange={(e) => setNewClient({ ...newClient, client_name: e.target.value })}
                    className="input-saas text-xs py-2.5 px-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Access Key</label>
                  <input
                    type="text"
                    required
                    value={newClient.access_key}
                    onChange={(e) => setNewClient({ ...newClient, access_key: e.target.value.toUpperCase() })}
                    className="input-saas font-mono uppercase font-black text-xs py-2.5 px-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">গ্রাহক কোন Netflix Gmail অ্যাকাউন্টে থাকবে?</label>
                  <select
                    value={newClient.account_id}
                    onChange={(e) => setNewClient({ ...newClient, account_id: e.target.value })}
                    className="input-saas text-xs font-mono font-bold py-2.5 px-3"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} ({acc.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মেয়াদ (Duration)</label>
                  <select
                    value={newClient.durationDays}
                    onChange={(e) => setNewClient({ ...newClient, durationDays: e.target.value })}
                    className="input-saas text-xs font-bold py-2.5 px-3"
                  >
                    <option value="7">৭ দিন</option>
                    <option value="30">১ মাস (30 Days)</option>
                    <option value="90">৩ মাস</option>
                    <option value="365">১ বছর</option>
                    <option value="lifetime">লাইফটাইম</option>
                  </select>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button type="submit" className="btn-primary-netflix flex-1 text-xs py-2.5 font-bold">তৈরি করুন</button>
                  <button type="button" onClick={() => setShowAddClient(false)} className="btn-secondary-saas text-xs py-2.5 px-4 font-bold">বাতিল</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADD NETFLIX ACCOUNT ================= */}
        {showAddAccount && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="saas-card-elevated max-w-sm w-full p-6 sm:p-7 space-y-4 animate-fade-up">
              <h3 className="text-lg font-black text-slate-900">নতুন Netflix Gmail Account যোগ করুন</h3>
              <form onSubmit={handleCreateAccount} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">অ্যাকাউন্টের নাম / লেবেল</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Netflix 4K Master #2"
                    value={newAccount.account_name}
                    onChange={(e) => setNewAccount({ ...newAccount, account_name: e.target.value })}
                    className="input-saas text-xs py-2.5 px-3"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gmail ইমেইল অ্যাড্রেস</label>
                  <input
                    type="email"
                    required
                    placeholder="yournewnetflix@gmail.com"
                    value={newAccount.email}
                    onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })}
                    className="input-saas text-xs font-mono font-bold py-2.5 px-3"
                  />
                </div>

                <p className="text-[11px] text-slate-600 leading-tight font-medium">
                  যোগ করার পর সাথে সাথেই এই অ্যাকাউন্টের জন্য তৈরি হওয়া Google Apps Script কোডটি পেয়ে যাবেন।
                </p>

                <div className="flex gap-2.5 pt-2">
                  <button type="submit" className="btn-primary-netflix flex-1 text-xs py-2.5 font-bold">যোগ করুন</button>
                  <button type="button" onClick={() => setShowAddAccount(false)} className="btn-secondary-saas text-xs py-2.5 px-4 font-bold">বাতিল</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
