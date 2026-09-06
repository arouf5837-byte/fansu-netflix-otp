import React, { useState } from 'react';
import { Database, Save, CheckCircle, AlertCircle, Sparkles, X, ExternalLink } from 'lucide-react';
import { saveSupabaseConfig, clearSupabaseConfig, getSupabaseClient } from '../supabaseClient';

export default function SettingsModal({ isOpen, onClose, onConfigSaved }) {
  const [url, setUrl] = useState(() => localStorage.getItem('nf_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [key, setKey] = useState(() => localStorage.getItem('nf_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      alert('Supabase Project URL এবং Anon Key উভয়ই প্রয়োজন');
      return;
    }

    saveSupabaseConfig(url, key);
    if (onConfigSaved) onConfigSaved();
    setTestResult({ success: true, message: 'Supabase কনফিগারেশন সফলভাবে সেভ হয়েছে!' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    clearSupabaseConfig();
    setUrl('');
    setKey('');
    if (onConfigSaved) onConfigSaved();
    setTestResult({ success: true, message: 'ডেমো / মক মোডে স্যুইচ করা হয়েছে।' });
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleTestConnection = async () => {
    if (!url.trim() || !key.trim()) {
      setTestResult({ success: false, message: 'টেস্ট করতে URL এবং Anon Key লিখুন' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      saveSupabaseConfig(url, key);
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('netflix_accounts').select('id').limit(1);

      if (error && !error.message.includes('permission')) {
        setTestResult({ success: false, message: 'কানেক্ট হয়েছে কিন্তু টেবিল পাওয়া যায়নি: ' + error.message + ' (দয়া করে SQL Schema রান করুন)' });
      } else {
        setTestResult({ success: true, message: '✅ Supabase কানেকশন সম্পূর্ণ সফল!' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'কানেকশন ব্যর্থ: ' + err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="glass-card-elevated max-w-lg w-full p-6 sm:p-8 space-y-6 animate-slide-down relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 btn-icon p-1.5 text-slate-500 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">Supabase ডাটাবেজ কনফিগারেশন</h3>
            <p className="text-xs text-slate-600 font-medium">আপনার Supabase ক্রেডেনশিয়াল দিয়ে লাইভ ডাটাবেজ যুক্ত করুন</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Supabase Project URL
            </label>
            <input
              type="text"
              required
              placeholder="https://xyzcompany.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-netflix font-mono text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Supabase Anon / Public API Key
            </label>
            <textarea
              rows={3}
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="input-netflix font-mono text-xs resize-none font-medium"
            />
          </div>

          {testResult && (
            <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              testResult.success ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              type="submit"
              className="btn-netflix flex-1 text-xs py-2.5 font-bold"
            >
              <Save className="w-4 h-4" />
              <span>কনফিগারেশন সেভ করুন</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="btn-secondary text-xs py-2.5 font-bold"
            >
              <span>{isTesting ? 'টেস্টিং...' : 'টেস্ট কানেকশন'}</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary text-xs py-2.5 text-amber-700 font-bold"
              title="Reset to Demo Data"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ডেমো মোড</span>
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-medium flex items-center justify-between">
          <span>Supabase অ্যাকাউন্ট নেই?</span>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-bold"
          >
            <span>Supabase ড্যাশবোর্ডে যান</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
