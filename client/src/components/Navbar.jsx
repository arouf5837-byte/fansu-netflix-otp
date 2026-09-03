import React from 'react';
import { ShieldCheck, User, Wifi } from 'lucide-react';
import { isConfigured } from '../supabaseClient';

export default function Navbar({ activeView, setActiveView }) {
  const isSupabaseReady = isConfigured();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs transition-all">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none" 
          onClick={() => setActiveView('client')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#e50914] to-[#b80710] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
            <span className="font-black text-base sm:text-lg text-white font-mono">LD</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-sm sm:text-lg tracking-wider text-slate-900">
                LEARNORY <span className="text-[#e50914]">DIGITAL</span>
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md bg-red-50 text-[#e50914] border border-red-200 shrink-0">
                OTT Services
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block">
              All Kind of Digital Subscriptions Provider
            </p>
          </div>
        </div>

        {/* View Navigation Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveView('client')}
            className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeView === 'client'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e50914]" />
            <span>Client Portal</span>
          </button>
          <button
            onClick={() => setActiveView('admin')}
            className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeView === 'admin'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#e50914]" />
            <span>Admin Panel</span>
          </button>
        </div>
      </div>
    </header>
  );
}
