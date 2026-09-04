import React, { useState, useEffect } from 'react';
import { 
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
  Info,
  ArrowRight,
  Shield,
  X,
  BookOpen
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
  
  // Instruction Modal State & active tab ('tv' | 'mobile' | 'rules')
  const [isGuideOpen, setIsGuideOpen] = useState(false);
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
          setError('আপনার অ্যাকাউন্টটি সাময়িকভাবে বন্ধ আছে। অ্যাডমিনের সাথে যোগাযোগ করুন।');
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
          setLatestOtp(payload.new);
          try {
            confetti({ particleCount: 45, spread: 65, origin: { y: 0.6 } });
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
      confetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } });
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
    <div className="w-full flex justify-center py-12 sm:py-16 md:py-24 px-4 sm:px-6">
      <div className="w-full max-w-2xl sm:max-w-3xl mx-auto flex flex-col items-center text-center space-y-10 sm:space-y-12">
        
        {/* ================= 1. HERO HEADER (ULTRA-SPACIOUS & ELEGANT) ================= */}
        <section className="space-y-4 sm:space-y-5 max-w-2xl animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full badge-shimmer text-[#e50914] text-xs sm:text-sm font-extrabold uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#e50914] animate-pulse" />
            <span>LEARNORY DIGITAL • SELF-SERVICE OTP</span>
          </div>
          
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-normal leading-tight">
            Netflix Self-Service Portal
          </h1>
          
          <p className="text-slate-600 text-sm sm:text-base font-normal leading-relaxed max-w-lg mx-auto pt-1">
            আপনার <strong className="text-slate-900 font-bold">Access Key</strong> দিন এবং তাৎক্ষণিকভাবে আপনার Netflix Login OTP ও TV Household কনফার্মেশন লিংক পেয়ে যান।
          </p>
        </section>

        {/* ================= 2. ACCESS KEY CARD ================= */}
        <section className="saas-card w-full p-7 sm:p-10 space-y-6 rounded-3xl animate-fade-up-delay-1 text-left">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchLatestOtp();
            }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="ACCESS KEY (যেমন: NF-7821)"
                  className="input-saas px-5 sm:px-6 py-4 sm:py-4.5 font-mono text-base sm:text-lg tracking-wider uppercase font-black text-slate-900 placeholder:normal-case placeholder:font-sans placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400"
                  aria-label="Enter your Netflix Access Key"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary-netflix py-4 sm:py-4.5 px-8 text-base font-bold disabled:opacity-50 shrink-0 group rounded-2xl"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>যাচাই হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>ওটিপি ও লিংক দেখুন</span>
                    <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>

            {/* Custom Modern Toggle & Client Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 font-medium pt-3 border-t border-slate-100">
              <label className="inline-flex items-center gap-3 cursor-pointer hover:text-slate-900 select-none group py-1">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberKey}
                    onChange={(e) => setRememberKey(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center ${
                    rememberKey 
                      ? 'bg-[#e50914] border-[#e50914] shadow-xs' 
                      : 'bg-white border-slate-300 group-hover:border-slate-400'
                  }`}>
                    {rememberKey && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                </div>
                <span className="text-slate-700 font-medium">এই ডিভাইসে মনে রাখুন</span>
              </label>

              {clientData && (
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 font-bold px-3.5 py-1.5 rounded-xl border border-emerald-200/80 text-xs sm:text-sm self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>গ্রাহক: <strong>{clientData.client_name}</strong></span>
                </div>
              )}
            </div>
          </form>

          {/* Inline Error */}
          {error && (
            <div className="p-4 sm:p-5 rounded-2xl bg-red-50/90 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-3 animate-fade-up">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ================= 3. RESULT CARD (OTP & TV HOUSEHOLD) ================= */}
        {clientData && (
          <section className="w-full animate-fade-up space-y-6">
            {latestOtp ? (
              <div className="saas-card-elevated w-full p-6 sm:p-9 md:p-10 space-y-7 border-t-4 border-t-[#e50914] text-center">
                
                {/* Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 border-b border-slate-100 pb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                    isOtpExpired(latestOtp.received_at)
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-red-50 text-[#e50914] border-red-200'
                  }`}>
                    {isOtpExpired(latestOtp.received_at) ? 'মেয়াদ শেষ (Expired)' : 'সর্বশেষ রিকোয়েস্ট (Latest Update)'}
                  </span>
                  
                  <span className="flex items-center gap-1.5 text-slate-500 font-bold text-xs sm:text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{getTimeAgo(latestOtp.received_at)} ({new Date(latestOtp.received_at).toLocaleTimeString()})</span>
                  </span>
                </div>

                {/* 📺 SMART TV HOUSEHOLD CONFIRMATION BOX */}
                {latestOtp.action_url && (
                  <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-blue-50/90 to-indigo-50/50 border-2 border-blue-200/80 shadow-xs space-y-5 text-center animate-fade-up">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-black uppercase tracking-wider border border-blue-200">
                      <Tv className="w-4 h-4 text-blue-700" />
                      <span>Smart TV Household Confirmation</span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-2xl font-black text-slate-900 leading-snug">
                        Did you request to update your Netflix Household?
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 font-medium max-w-md mx-auto leading-relaxed">
                        টিভিতে নেটফ্লিক্স চালু করার জন্য নিচের নীল বাটনে ক্লিক করে সাথে সাথে কনফার্ম করুন:
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                      <a
                        href={latestOtp.action_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary-netflix py-3.5 sm:py-4 px-7 text-sm sm:text-base font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md flex items-center justify-center gap-2 rounded-xl"
                      >
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>Yes, This Was Me (কনফার্ম করুন)</span>
                        <ExternalLink className="w-4 h-4 text-blue-200" />
                      </a>

                      <button
                        onClick={() => handleCopyLink(latestOtp.action_url)}
                        className="btn-secondary-saas text-sm py-3.5 sm:py-4 px-5 flex items-center justify-center gap-2 font-bold rounded-xl"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'লিংক কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 font-medium pt-1">
                      * এই কনফার্মেশন লিংকটির মেয়াদ ১৫ মিনিট পর্যন্ত কার্যকর থাকবে।
                    </p>
                  </div>
                )}

                {/* 🔢 BIG BOLD OTP CODE DISPLAY */}
                {latestOtp.otp_code && (
                  <div className="otp-display-saas my-3 p-6 sm:p-8 text-center">
                    <p className="text-xs sm:text-sm font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      Netflix Sign-in / OTP Code
                    </p>
                    
                    <div className="otp-code-digits-saas my-4 select-all font-mono font-black text-5xl sm:text-7xl text-slate-950">
                      {latestOtp.otp_code}
                    </div>
                    
                    <div className="mt-6">
                      <button
                        onClick={() => handleCopyOtp(latestOtp.otp_code)}
                        className={`btn-primary-netflix w-full py-4 sm:py-4.5 text-base sm:text-lg font-black rounded-xl transition-all shadow-md ${
                          copiedCode ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20' : ''
                        }`}
                      >
                        {copiedCode ? (
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-6 h-6 text-white stroke-[2.5]" />
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

                {/* Expiry Alert */}
                {isOtpExpired(latestOtp.received_at) && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>এই কোড/লিংকের ১৫ মিনিটের মেয়াদ শেষ হয়েছে। প্রয়োজনে Netflix-এ আবার নতুন রিকোয়েস্ট পাঠান।</span>
                  </div>
                )}

                <p className="text-xs text-slate-500 font-medium pt-1">
                  Netflix থেকে নতুন রিকোয়েস্ট আসলে স্ক্রিন স্বয়ংক্রিয়ভাবে রিয়েলটাইমে আপডেট হবে।
                </p>
              </div>
            ) : (
              /* Clean Empty State */
              <div className="saas-card w-full p-8 sm:p-12 text-center space-y-4 rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                  <Clock className="w-7 h-7 animate-pulse text-slate-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">বর্তমানে কোনো নতুন ওটিপি বা লিংক নেই</h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
                  আপনার টিভি বা মোবাইলে <strong className="text-slate-900 font-bold">"Watch Temporarily"</strong> বা <strong className="text-slate-900 font-bold">"Send Code"</strong> চাপার পর <strong className="text-amber-700 font-bold">১ মিনিট অপেক্ষা করুন</strong>। এখানে স্বয়ংক্রিয়ভাবে কোড চলে আসবে।
                </p>
              </div>
            )}
          </section>
        )}

        {/* ================= 4. CLEAN MENU POPUP TRIGGER (REPLACES CLUTTER) ================= */}
        <section className="w-full flex flex-col items-center justify-center animate-fade-up-delay-2 pt-2">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="group saas-card px-6 py-4 rounded-2xl flex items-center gap-3.5 hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer text-slate-700 hover:text-slate-950"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#e50914] flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-slate-900">ব্যবহার নির্দেশিকা ও নিয়মাবলী</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  How to Use
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Smart TV, Mobile Login এবং জরুরি নিয়ম দেখতে ক্লিক করুন</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-2 group-hover:translate-x-1 group-hover:text-slate-700 transition-all" />
          </button>
        </section>

        {/* ================= 5. FOOTER ================= */}
        <footer className="text-xs sm:text-sm text-slate-500 font-medium pt-4 pb-10 flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 select-none">
            <div className="w-5 h-5 rounded-md bg-[#e50914] flex items-center justify-center text-white text-[9px] font-mono font-black">
              LD
            </div>
            <p>
              Powered by <strong className="text-slate-900 font-extrabold">Learnory Digital</strong>
            </p>
          </div>
          <p className="text-slate-400 text-xs">
            All Kind of Digital Subscriptions Provider • Secure Automated Self-Service
          </p>
        </footer>

      </div>

      {/* ================= 6. INSTRUCTION MENU POPUP / MODAL ================= */}
      {isGuideOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 backdrop-blur-md animate-fade-up"
          onClick={() => setIsGuideOpen(false)}
        >
          <div 
            className="saas-card-elevated w-full max-w-xl max-h-[85vh] flex flex-col p-6 sm:p-7 rounded-3xl bg-white text-left shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="ব্যবহার নির্দেশিকা ও নিয়মাবলী"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-center text-[#e50914] shadow-xs shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">ব্যবহার নির্দেশিকা ও নিয়মাবলী</h2>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">How to Use & Guidelines</p>
                </div>
              </div>

              <button
                onClick={() => setIsGuideOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0"
                aria-label="Close Guide Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive Navigation Tabs */}
            <div className="flex gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200 my-4 shrink-0" role="tablist">
              <button
                onClick={() => setActiveInstructionTab('tv')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeInstructionTab === 'tv'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                role="tab"
                aria-selected={activeInstructionTab === 'tv'}
              >
                <Tv className="w-4 h-4" />
                <span>Smart TV</span>
              </button>

              <button
                onClick={() => setActiveInstructionTab('mobile')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeInstructionTab === 'mobile'
                    ? 'bg-[#e50914] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                role="tab"
                aria-selected={activeInstructionTab === 'mobile'}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile / PC</span>
              </button>

              <button
                onClick={() => setActiveInstructionTab('rules')}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-200 ${
                  activeInstructionTab === 'rules'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                role="tab"
                aria-selected={activeInstructionTab === 'rules'}
              >
                <Info className="w-4 h-4" />
                <span>জরুরি নিয়ম</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Tab 1: Smart TV / Household */}
              {activeInstructionTab === 'tv' && (
                <div className="space-y-3.5 animate-fade-up">
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200 timeline-step-connector">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                      01
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">Watch Temporarily বাটনে চাপুন</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        টিভিতে Household সমস্যা আসলে রিমোট দিয়ে <strong className="text-blue-800 font-bold">"I'm Travelling"</strong> বা <strong className="text-blue-800 font-bold">"Watch Temporarily"</strong> বেছে নিয়ে Send Email চাপুন।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200 timeline-step-connector">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                      02
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">১ মিনিট অপেক্ষা করুন</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        বাটন চাপার পর সার্ভার থেকে কনফার্মেশন লিংক আসতে <strong className="text-amber-800 font-bold">১ মিনিট সময় লাগতে পারে</strong>। পেজ বারবার রিফ্রেশ করার কোনো প্রয়োজন নেই।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                      03
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">"Yes, This Was Me" চাপুন</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        উপরে আসা নীল বাটনে <strong className="text-emerald-800 font-bold">"Yes, This Was Me"</strong> চাপলেই আপনার টিভি স্বয়ংক্রিয়ভাবে চালু হয়ে যাবে।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Mobile / PC Login */}
              {activeInstructionTab === 'mobile' && (
                <div className="space-y-3.5 animate-fade-up">
                  <div className="p-4 sm:p-5 rounded-2xl bg-red-50/50 border border-red-100 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200 timeline-step-connector">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-[#e50914] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                      01
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">Send Code চাপুন</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        মোবাইল বা ব্রাউজারে Netflix লগইন করার সময় <strong className="text-red-700 font-bold">"Send Code"</strong> চাপুন।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200 timeline-step-connector">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-amber-500 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                      02
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">১ মিনিট অপেক্ষা</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        কোড আসার জন্য <strong className="text-amber-800 font-bold">১ মিনিট পর্যন্ত</strong> অপেক্ষা করুন।
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-4 hover:-translate-y-0.5 transition-transform duration-200">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-xs">
                      03
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900">কোড কপি ও লগইন</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        স্ক্রিনে ওটিপি দেখা গেলে <strong className="text-emerald-800 font-bold">"ওটিপি কপি করুন"</strong> বাটনে চাপ দিয়ে Netflix-এ বসিয়ে লগইন সম্পন্ন করুন।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Important Rules */}
              {activeInstructionTab === 'rules' && (
                <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed animate-fade-up bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>১ মিনিটের নিয়ম:</strong> ইমেইল পাঠানোর পর সার্ভারে ডেটা সিঙ্ক হতে ১ মিনিট পর্যন্ত সময় লাগে। বারবার রিফ্রেশ করবেন না।</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <span><strong>১৫ মিনিট মেয়াদ:</strong> প্রতিটি ওটিপি ও কনফার্মেশন লিংক ১৫ মিনিট কার্যকর থাকে।</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span><strong>রিয়েলটাইম লাইভ সিঙ্ক:</strong> Access Key দেওয়া থাকলে নতুন কোড আসা মাত্রই পেজে স্বয়ংক্রিয়ভাবে ভেসে উঠবে।</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setIsGuideOpen(false)}
                className="btn-primary-netflix py-2.5 px-6 text-xs sm:text-sm font-extrabold rounded-xl"
              >
                বুঝেছি (Close)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

