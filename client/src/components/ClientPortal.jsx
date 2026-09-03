import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Tv,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { isConfigured, getSupabaseClient } from '../supabaseClient';
import { getMockData } from '../mockData';

export default function ClientPortal() {
  const [accessKey, setAccessKey] = useState('');
  const [rememberKey, setRememberKey] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [latestOtp, setLatestOtp] = useState(null);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Instruction slide tab: 'tv' | 'mobile' | 'rules'
  const [activeInstructionTab, setActiveInstructionTab] = useState('tv');

  // Auto-search if key is in URL or saved in localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlKey = params.get('key') || params.get('k') || localStorage.getItem('nf_saved_client_key') || '';
    if (urlKey) {
      setAccessKey(urlKey.toUpperCase());
      fetchLatestOtp(urlKey.toUpperCase());
    }
  }, []);

  // Fetch only the single latest OTP for this client
  const fetchLatestOtp = async (keyToSearch) => {
    const key = (keyToSearch || accessKey).trim().toUpperCase();
    if (!key) {
      setError('আপনার Access Key টি লিখুন (যেমন: NF-7821)');
      return;
    }

    setIsLoading(true);
    setError('');

    if (isConfigured()) {
      const supabase = getSupabaseClient();
      try {
        // 1. Verify Client
        const { data: client, error: clientErr } = await supabase
          .from('client_keys')
          .select('*, netflix_accounts(email, account_name)')
          .ilike('access_key', key)
          .single();

        if (clientErr || !client) {
          setError('ভুল বা মেয়াদোত্তীর্ণ Access Key! সঠিক কি প্রদান করুন।');
          setClientData(null);
          setLatestOtp(null);
          setIsLoading(false);
          return;
        }

        if (!client.is_active) {
          setError('আপনার একাউন্টটি সাময়িকভাবে বন্ধ আছে।');
          setClientData(null);
          setIsLoading(false);
          return;
        }

        setClientData(client);

        // 2. Fetch STRICTLY 1 single most recent OTP
        const { data: otpList, error: otpErr } = await supabase
          .from('otp_logs')
          .select('*')
          .eq('account_id', client.account_id)
          .order('received_at', { ascending: false })
          .limit(1);

        if (!otpErr && otpList && otpList.length > 0) {
          setLatestOtp(otpList[0]);
        } else {
          setLatestOtp(null);
        }

        if (rememberKey) {
          localStorage.setItem('nf_saved_client_key', key);
        }
      } catch (err) {
        setError('ডাটা লোড করতে সমস্যা হয়েছে: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Demo fallback
      setTimeout(() => {
        const mock = getMockData();
        const client = mock.clients.find(c => c.access_key.toUpperCase() === key);
        if (!client) {
          setError('ভুল Access Key! ডেমো কি: NF-7821');
          setClientData(null);
          setLatestOtp(null);
          setIsLoading(false);
          return;
        }
        const account = mock.accounts.find(a => a.id === client.account_id);
        setClientData({ ...client, netflix_accounts: account });
        const accountOtps = mock.otps.filter(o => o.account_id === client.account_id);
        setLatestOtp(accountOtps[0] || null);
        setIsLoading(false);
      }, 200);
    }
  };

  // Realtime Live WebSocket Listener for instant code replacement
  useEffect(() => {
    if (!isConfigured() || !clientData?.account_id) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`live_otp_${clientData.account_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'otp_logs',
          filter: `account_id=eq.${clientData.account_id}`
        },
        (payload) => {
          // Immediately replace with the new single latest OTP
          setLatestOtp(payload.new);
          try {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          } catch (e) {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientData?.account_id]);

  // Copy OTP code
  const handleCopyOtp = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
  };

  // Copy Verification Link
  const handleCopyLink = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Time elapsed formatter
  const getTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diffSec < 10) return 'এইমাত্র (Just now)';
    if (diffSec < 60) return `${diffSec} সেকেন্ড আগে`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    return `${Math.floor(diffMin / 60)} ঘণ্টা আগে`;
  };

  // Check if OTP is older than 15 minutes
  const isOtpExpired = (dateStr) => {
    if (!dateStr) return false;
    const diffMin = (new Date() - new Date(dateStr)) / (1000 * 60);
    return diffMin > 15;
  };

  return (
    <div className="w-full flex justify-center py-8 sm:py-14 md:py-16 px-4 sm:px-6">
      <div className="w-full max-w-2xl sm:max-w-3xl mx-auto flex flex-col items-center text-center space-y-7 sm:space-y-9">
        
        {/* ================= 1. BRAND HEADER ================= */}
        <div className="space-y-3 sm:space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#e50914] text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-4 h-4" />
            <span>LEARNORY DIGITAL • SELF-SERVICE OTP</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Netflix Self-Service Portal
          </h1>
          
          <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
            আপনার <strong className="text-slate-900 font-bold">Access Key</strong> দিন এবং তাৎক্ষণিকভাবে আপনার Netflix Login OTP ও TV Household কনফার্মেশন লিঙ্ক পেয়ে যান।
          </p>
        </div>

        {/* ================= 2. ACCESS KEY SEARCH CARD ================= */}
        <div className="glass-card w-full p-6 sm:p-8 space-y-5 rounded-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchLatestOtp();
            }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="Access Key (যেমন: NF-7821)"
                  className="input-netflix pl-12 pr-4 py-3.5 sm:py-4 font-mono text-lg sm:text-xl tracking-widest uppercase font-black text-center sm:text-left text-slate-900 rounded-xl"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="btn-netflix py-3.5 sm:py-4 px-8 text-base font-extrabold disabled:opacity-50 rounded-xl shrink-0"
              >
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-white mx-auto" />
                ) : (
                  <span>ওটিপি ও লিঙ্ক দেখুন</span>
                )}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-slate-600 font-medium pt-1">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 select-none justify-center sm:justify-start">
                <input
                  type="checkbox"
                  checked={rememberKey}
                  onChange={(e) => setRememberKey(e.target.checked)}
                  className="rounded accent-[#e50914] w-4 h-4 cursor-pointer"
                />
                <span>এই ডিভাইসে মনে রাখুন</span>
              </label>

              {clientData && (
                <span className="text-emerald-800 font-bold flex items-center justify-center gap-2 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  গ্রাহক: {clientData.client_name}
                </span>
              )}
            </div>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-3 text-left animate-slide-down">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* ================= 3. BIG PROMINENT RESULT CARD (OTP & TV HOUSEHOLD) ================= */}
        {clientData && (
          <div className="w-full animate-slide-down space-y-6">
            {latestOtp ? (
              <div className="glass-card-elevated w-full p-6 sm:p-9 md:p-10 space-y-6 sm:space-y-7 border-t-4 border-t-[#e50914] rounded-2xl">
                
                {/* Header Status with Expired / Time ago */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm text-slate-600 border-b border-slate-100 pb-4">
                  <span className={`badge ${isOtpExpired(latestOtp.received_at) ? 'badge-expired' : 'badge-netflix'} text-xs sm:text-sm font-black uppercase tracking-wider py-1 px-3 self-start sm:self-auto`}>
                    {isOtpExpired(latestOtp.received_at) ? 'মেয়াদ শেষ (Expired)' : 'সর্বশেষ রিকোয়েস্ট (Latest Update)'}
                  </span>
                  
                  <span className="flex items-center gap-2 text-slate-600 font-bold self-start sm:self-auto">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{getTimeAgo(latestOtp.received_at)} ({new Date(latestOtp.received_at).toLocaleTimeString()})</span>
                  </span>
                </div>

                {/* 📺 TV HOUSEHOLD CONFIRMATION BOX (Spacious & Distinct) */}
                {latestOtp.action_url && (
                  <div className="p-6 sm:p-8 rounded-2xl bg-blue-50/80 border-2 border-blue-200 shadow-xs space-y-5 text-center animate-slide-down">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-900 text-xs font-black uppercase tracking-wider border border-blue-200">
                      <Tv className="w-4 h-4 text-blue-700" />
                      <span>Smart TV Household Confirmation</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                        Did you request to update your Netflix Household?
                      </h3>
                      <p className="text-sm sm:text-base text-slate-700 font-medium max-w-md mx-auto leading-relaxed">
                        টিভিতে নেটফ্লিক্স চালু করার জন্য নিচের নীল বাটনে ক্লিক করে সাথে সাথে কনফার্ম করুন:
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <a
                        href={latestOtp.action_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-netflix py-4 px-7 text-sm sm:text-base font-black bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2.5 rounded-xl transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>Yes, This Was Me (কনফার্ম করুন)</span>
                        <ExternalLink className="w-4 h-4 text-blue-200" />
                      </a>

                      <button
                        onClick={() => handleCopyLink(latestOtp.action_url)}
                        className="btn-secondary text-sm py-4 px-5 flex items-center justify-center gap-2 font-bold rounded-xl"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'লিঙ্ক কপি হয়েছে!' : 'লিঙ্ক কপি করুন'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 font-medium pt-1">
                      * এই কনফার্মেশন লিঙ্কটির মেয়াদ ১৫ মিনিট পর্যন্ত কার্যকর থাকবে।
                    </p>
                  </div>
                )}

                {/* 🔢 BIG BOLD OTP DIGITS BOX */}
                {latestOtp.otp_code && (
                  <div className="otp-display-box my-3 p-6 sm:p-8 rounded-2xl bg-red-50/20 border-2 border-red-500">
                    <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      Netflix Sign-in / OTP Code
                    </p>
                    
                    <div className="otp-code-digits my-4 select-all font-mono font-black text-5xl sm:text-7xl text-slate-950">
                      {latestOtp.otp_code}
                    </div>
                    
                    {/* Big Copy Button */}
                    <div className="mt-5 sm:mt-6">
                      <button
                        onClick={() => handleCopyOtp(latestOtp.otp_code)}
                        className={`btn-netflix w-full py-4 sm:py-4.5 text-base sm:text-lg font-black transition-all shadow-md rounded-xl ${
                          copiedCode ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                        }`}
                      >
                        {copiedCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-6 h-6 text-white" />
                            <span>কপি সম্পন্ন হয়েছে! (Copied)</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Copy className="w-6 h-6 text-white" />
                            <span>ওটিপি কপি করুন (Copy Code)</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Warning if older than 15 mins */}
                {isOtpExpired(latestOtp.received_at) && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>এই কোড/লিঙ্কের ১৫ মিনিটের মেয়াদ শেষ হয়েছে। প্রয়োজনে Netflix-এ আবার নতুন রিকোয়েস্ট পাঠান।</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 font-medium text-center pt-2">
                  Netflix থেকে নতুন রিকোয়েস্ট আসলে স্ক্রিন স্বয়ংক্রিয়ভাবে রিয়েলটাইমে আপডেট হবে।
                </p>
              </div>
            ) : (
              /* Clean Spacious Empty State */
              <div className="glass-card w-full p-8 sm:p-12 text-center space-y-4 rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Clock className="w-7 h-7 animate-pulse text-slate-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">বর্তমানে কোনো নতুন ওটিপি বা লিঙ্ক নেই</h3>
                <p className="text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                  আপনার টিভি বা মোবাইলে <strong className="text-slate-900 font-bold">"Watch Temporarily"</strong> বা <strong className="text-slate-900 font-bold">"Send Code"</strong> চাপার পর <strong className="text-amber-700 font-bold">১ মিনিট অপেক্ষা করুন</strong>। এখানে স্বয়ংক্রিয়ভাবে কোড চলে আসবে।
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= 4. MODERN SPACIOUS INSTRUCTIONS BOX ================= */}
        <div className="glass-card w-full p-6 sm:p-8 text-left space-y-6 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-5 h-5 text-[#e50914]" />
              <span className="text-sm sm:text-base font-black text-slate-900">ব্যবহার নির্দেশিকা (How to Use)</span>
            </div>
            <span className="text-xs font-bold text-slate-500">Learnory Self-Service</span>
          </div>

          {/* Interactive Slide Tabs Menu */}
          <div className="flex flex-col sm:flex-row gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setActiveInstructionTab('tv')}
              className={`flex-1 py-3 px-3 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeInstructionTab === 'tv'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Smart TV / Household</span>
            </button>

            <button
              onClick={() => setActiveInstructionTab('mobile')}
              className={`flex-1 py-3 px-3 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeInstructionTab === 'mobile'
                  ? 'bg-[#e50914] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Mobile / PC Login</span>
            </button>

            <button
              onClick={() => setActiveInstructionTab('rules')}
              className={`flex-1 py-3 px-3 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeInstructionTab === 'rules'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>জরুরি নিয়ম</span>
            </button>
          </div>

          {/* TAB 1: SMART TV / HOUSEHOLD */}
          {activeInstructionTab === 'tv' && (
            <div className="space-y-3.5 animate-slide-down">
              <div className="p-4 sm:p-5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                  ১
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">Watch Temporarily বাটনে চাপুন</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    টিভিতে Household সমস্যা আসলে রিমোট দিয়ে <strong className="text-blue-800 font-bold">"I'm Travelling"</strong> বা <strong className="text-blue-800 font-bold">"Watch Temporarily"</strong> বেছে নিয়ে Send Email চাপুন।
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                  ২
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">১ মিনিট অপেক্ষা করুন</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    বাটন চাপার পর সার্ভার থেকে কনফার্মেশন লিঙ্ক আসতে <strong className="text-amber-800 font-bold">১ মিনিট সময় লাগতে পারে</strong>। পেজ বারবার রিফ্রেশ করার কোনো প্রয়োজন নেই।
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                  ৩
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">"Yes, This Was Me" চাপুন</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    উপরে আসা নীল বাটনে <strong className="text-emerald-800 font-bold">"Yes, This Was Me"</strong> চাপলেই আপনার টিভি স্বয়ংক্রিয়ভাবে চালু হয়ে যাবে।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE / PC LOGIN */}
          {activeInstructionTab === 'mobile' && (
            <div className="space-y-3.5 animate-slide-down">
              <div className="p-4 sm:p-5 rounded-xl bg-red-50/70 border border-red-100 flex items-start gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-[#e50914] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                  ১
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">Send Code চাপুন</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    মোবাইল বা ব্রাউজারে Netflix লগইন করার সময় <strong className="text-red-700 font-bold">"Send Code"</strong> চাপুন।
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-start gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                  ২
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">১ মিনিট অপেক্ষা</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    কোড আসার জন্য <strong className="text-amber-800 font-bold">১ মিনিট পর্যন্ত</strong> অপেক্ষা করুন।
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-4">
                <span className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                  ৩
                </span>
                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-black text-slate-900">কোড কপি ও লগইন</h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                    স্ক্রিনে ওটিপি দেখা গেলে <strong className="text-emerald-800 font-bold">"ওটিপি কপি করুন"</strong> বাটনে চাপ দিয়ে Netflix-এ বসিয়ে লগইন সম্পন্ন করুন।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RULES & TIPS */}
          {activeInstructionTab === 'rules' && (
            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed animate-slide-down bg-slate-50 p-5 rounded-xl border border-slate-200">
              <p className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <span><strong>১ মিনিটের নিয়ম:</strong> ইমেইল পাঠানোর পর সার্ভারে ডেটা সিঙ্ক হতে ১ মিনিট পর্যন্ত সময় লাগে। বারবার রিফ্রেশ করবেন না।</span>
              </p>
              <p className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                <span><strong>১৫ মিনিট মেয়াদ:</strong> প্রতিটি ওটিপি ও কনফার্মেশন লিঙ্ক ১৫ মিনিট কার্যকর থাকে।</span>
              </p>
              <p className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
                <span><strong>রিয়েলটাইম লাইভ সিঙ্ক:</strong> Access Key দেওয়া থাকলে নতুন কোড আসা মাত্রই পেজে স্বয়ংক্রিয়ভাবে ভেসে উঠবে।</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer Credit */}
        <div className="text-xs sm:text-sm text-slate-500 font-medium pt-2 pb-6">
          <p>Powered by <strong className="text-slate-900 font-black">Learnory Digital</strong> • All Kind of Digital Subscriptions Provider</p>
        </div>
      </div>
    </div>
  );
}
