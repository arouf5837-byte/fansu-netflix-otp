import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Clock3, Copy, ExternalLink, HelpCircle, LoaderCircle, ShieldCheck, Smartphone, Tv, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSupabaseClient, isConfigured } from '../supabaseClient';
import { getMockData } from '../mockData';

const EXPIRY_MINUTES = 15;

const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (seconds < 60) return 'এইমাত্র';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} মিনিট আগে`;
  return `${Math.floor(minutes / 60)} ঘণ্টা আগে`;
};

const isExpired = (dateStr) => !dateStr || Date.now() - new Date(dateStr).getTime() > EXPIRY_MINUTES * 60 * 1000;

const isSafeNetflixUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.hostname === 'netflix.com' || parsed.hostname.endsWith('.netflix.com'));
  } catch {
    return false;
  }
};

export default function ClientPortal() {
  const [accessKey, setAccessKey] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('key') || params.get('k') || localStorage.getItem('nf_saved_client_key') || '').toUpperCase();
  });
  const [rememberKey, setRememberKey] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [latestOtp, setLatestOtp] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const hasAutoLoaded = useRef(false);

  const loadPortal = useCallback(async (keyToSearch, { quiet = false } = {}) => {
    const key = (keyToSearch || accessKey).trim().toUpperCase();
    if (!key) {
      if (!quiet) setError('আপনার Access Key লিখুন।');
      return;
    }

    if (!quiet) setIsLoading(true);
    setError('');

    try {
      if (isConfigured()) {
        const supabase = getSupabaseClient();
        const { data: client, error: clientError } = await supabase
          .from('client_keys')
          .select('*, netflix_accounts(email, account_name)')
          .ilike('access_key', key)
          .single();

        if (clientError || !client || !client.is_active || (client.valid_until && new Date(client.valid_until) <= new Date())) {
          setClientData(null);
          setLatestOtp(null);
          if (!quiet) setError('এই Access Keyটি সঠিক নয় বা এর মেয়াদ শেষ হয়েছে।');
          return;
        }

        const { data: otpList, error: otpError } = await supabase
          .from('otp_logs')
          .select('*')
          .eq('account_id', client.account_id)
          .order('received_at', { ascending: false })
          .limit(1);

        if (otpError) throw otpError;
        setClientData(client);
        setLatestOtp(otpList?.[0] || null);
      } else {
        const mock = getMockData();
        const client = mock.clients.find((item) => item.access_key.toUpperCase() === key);
        if (!client || !client.is_active || (client.valid_until && new Date(client.valid_until) <= new Date())) {
          setClientData(null);
          setLatestOtp(null);
          if (!quiet) setError('এই Access Keyটি সঠিক নয় বা এর মেয়াদ শেষ হয়েছে।');
          return;
        }
        const account = mock.accounts.find((item) => item.id === client.account_id);
        setClientData({ ...client, netflix_accounts: account });
        setLatestOtp(mock.otps.filter((item) => item.account_id === client.account_id)[0] || null);
      }

      if (rememberKey) localStorage.setItem('nf_saved_client_key', key);
      else localStorage.removeItem('nf_saved_client_key');
    } catch (loadError) {
      if (!quiet) setError('তথ্য লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।');
      console.error('Client portal load failed:', loadError);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [accessKey, rememberKey]);

  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    const params = new URLSearchParams(window.location.search);
    const savedKey = params.get('key') || params.get('k') || localStorage.getItem('nf_saved_client_key') || '';
    if (savedKey) loadPortal(savedKey.toUpperCase());
  }, [loadPortal]);

  useEffect(() => {
    if (!isConfigured() || !clientData?.account_id) return undefined;
    const supabase = getSupabaseClient();
    if (!supabase) return undefined;

    const channel = supabase
      .channel(`live_otp_${clientData.account_id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'otp_logs', filter: `account_id=eq.${clientData.account_id}`,
      }, (payload) => {
        setLatestOtp(payload.new);
        try { confetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } }); } catch { /* Decorative only. */ }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [clientData?.account_id]);

  useEffect(() => {
    if (!isGuideOpen) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && setIsGuideOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isGuideOpen]);

  const handleCopy = async (value, type) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(''), 1800);
      if (type === 'code') confetti({ particleCount: 28, spread: 45, origin: { y: 0.7 } });
    } catch {
      setError('কপি করা যায়নি। কোডটি চেপে ধরে কপি করুন।');
    }
  };

  const hasFreshOtp = latestOtp && !isExpired(latestOtp.received_at);
  const verificationUrl = latestOtp?.action_url && isSafeNetflixUrl(latestOtp.action_url) ? latestOtp.action_url : null;

  return (
    <div className="portal-shell">
      <section className="portal-hero">
        <div className="eyebrow"><ShieldCheck size={15} /> নিরাপদ সেলফ-সার্ভিস</div>
        <h1>আপনার Netflix code,<br />এক জায়গায়।</h1>
        <p>Access Key দিন। নতুন code বা TV verification link এলে পেজটি নিজে থেকেই আপডেট হবে।</p>
      </section>

      <section className="portal-card access-card" aria-label="Access Key">
        <form onSubmit={(event) => { event.preventDefault(); loadPortal(); }}>
          <label htmlFor="access-key">Access Key</label>
          <div className="access-form-row">
            <input id="access-key" type="text" value={accessKey} onChange={(event) => setAccessKey(event.target.value.toUpperCase())} placeholder="যেমন: NF-7821" autoComplete="off" spellCheck="false" />
            <button type="submit" className="button-primary" disabled={isLoading}>
              {isLoading ? <LoaderCircle className="spin" size={18} /> : <>দেখুন <ArrowRight size={17} /></>}
            </button>
          </div>
          <label className="remember-key"><input type="checkbox" checked={rememberKey} onChange={(event) => setRememberKey(event.target.checked)} /><span>এই ডিভাইসে মনে রাখুন</span></label>
        </form>
        {error && <p className="portal-message error-message" role="alert">{error}</p>}
      </section>

      {clientData && (
        <section className="portal-card result-card" aria-live="polite">
          <div className="result-header">
            <div><span className="result-label">আপনার সর্বশেষ আপডেট</span><strong>{clientData.client_name}</strong></div>
            {latestOtp?.received_at && <span className={hasFreshOtp ? 'status-pill live' : 'status-pill'}>{hasFreshOtp ? getTimeAgo(latestOtp.received_at) : 'মেয়াদ শেষ'}</span>}
          </div>

          {!latestOtp ? (
            <div className="waiting-state">
              <div className="waiting-icon-box">
                <Clock3 size={22} />
              </div>
              <div className="waiting-text-group">
                <h2>এখনও নতুন কোড আসেনি</h2>
                <p>Netflix অ্যাপ বা ডিভাইস থেকে কোড বা ভেরিফিকেশন রিকোয়েস্ট পাঠান।</p>
                <div className="waiting-auto-notice">
                  <span className="live-ping-dot" />
                  <span>রিকোয়েস্ট পাঠানোর পর অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন। এখানে কোড স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে (সাধারণত ৩০-৬০ সেকেন্ড সময় লাগতে পারে)। কোনো বাটন চাপার বা পেজ রিফ্রেশ করার প্রয়োজন নেই।</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="result-content">
              {latestOtp.otp_code && (
                <div className={hasFreshOtp ? 'code-panel' : 'code-panel expired'}>
                  <span>Sign-in code</span><output>{latestOtp.otp_code}</output>
                  <button type="button" onClick={() => handleCopy(latestOtp.otp_code, 'code')} className="button-primary full-width">
                    {copied === 'code' ? <><Check size={18} /> কপি হয়েছে</> : <><Copy size={18} /> Code কপি করুন</>}
                  </button>
                </div>
              )}

              {verificationUrl && (
                <div className="verification-panel">
                  <div className="panel-icon"><Tv size={21} /></div>
                  <div><h2>TV verification</h2><p>Netflix-এ Household নিশ্চিত করতে নিচের বাটন ব্যবহার করুন।</p></div>
                  <div className="verification-actions">
                    <a className="button-secondary" href={verificationUrl} target="_blank" rel="noopener noreferrer">Open link <ExternalLink size={16} /></a>
                    <button type="button" className="icon-button" onClick={() => handleCopy(verificationUrl, 'link')} aria-label="লিংক কপি করুন">{copied === 'link' ? <Check size={17} /> : <Copy size={17} />}</button>
                  </div>
                </div>
              )}
              {!hasFreshOtp && <p className="portal-message neutral-message">এই code বা linkটির সময় শেষ হয়েছে। Netflix-এ নতুন request পাঠান।</p>}
            </div>
          )}
        </section>
      )}

      <button type="button" className="help-trigger" onClick={() => setIsGuideOpen(true)}><HelpCircle size={18} /> ব্যবহারবিধি <span>TV ও mobile</span></button>

      {isGuideOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsGuideOpen(false)}>
          <section className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><span className="eyebrow"><HelpCircle size={14} /> সাহায্য</span><h2 id="guide-title">দ্রুত ব্যবহারবিধি</h2></div><button type="button" className="icon-button" onClick={() => setIsGuideOpen(false)} aria-label="বন্ধ করুন"><X size={19} /></button></div>
            <div className="guide-grid">
              <article><Tv size={22} /><h3>Smart TV</h3><ol><li>“Watch Temporarily” বা “I’m Travelling” নির্বাচন করুন।</li><li>Netflix থেকে link আসা পর্যন্ত অপেক্ষা করুন।</li><li>উপরের TV verification link খুলুন।</li></ol></article>
              <article><Smartphone size={22} /><h3>Mobile বা PC</h3><ol><li>Netflix-এ “Send Code” চাপুন।</li><li>উপরে code দেখা গেলে কপি করুন।</li><li>Netflix-এ codeটি বসান।</li></ol></article>
            </div>
            <p className="guide-note">নতুন request আসার পর সাধারণত অল্প সময় লাগে। বারবার refresh দেওয়ার প্রয়োজন নেই।</p>
          </section>
        </div>
      )}
    </div>
  );
}
