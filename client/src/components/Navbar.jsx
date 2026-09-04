import React from 'react';
import { ShieldCheck, User, Sparkles } from 'lucide-react';

export default function Navbar({ activeView, setActiveView }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5">
        
        {/* Left: Brand Logo & Title */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none transition-transform active:scale-[0.99]" 
          onClick={() => setActiveView('client')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveView('client')}
        >
          {/* Logo Mark */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e50914] via-[#d00712] to-[#99040c] flex items-center justify-center shadow-[0_2px_10px_rgba(229,9,20,0.3)] group-hover:shadow-[0_4px_16px_rgba(229,9,20,0.4)] transition-all duration-200 shrink-0">
            <span className="font-black text-lg text-white font-mono tracking-tighter">LD</span>
          </div>
          
          {/* Brand Titles */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                LEARNORY <span className="text-[#e50914]">DIGITAL</span>
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-[#e50914] border border-red-200/80 shadow-2xs shrink-0">
                OTT Services
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5 hidden sm:block">
              All Kind of Digital Subscriptions Provider
            </p>
          </div>
        </div>

        {/* Right: Modern Pill Navigation Switcher */}
        <nav className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-inner" aria-label="Main Navigation">
          <button
            onClick={() => setActiveView('client')}
            className={`relative flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeView === 'client'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 text-slate-950 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            aria-current={activeView === 'client' ? 'page' : undefined}
          >
            <User className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeView === 'client' ? 'text-[#e50914]' : 'text-slate-500'}`} />
            <span>Client Portal</span>
          </button>

          <button
            onClick={() => setActiveView('admin')}
            className={`relative flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeView === 'admin'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 text-slate-950 font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
            aria-current={activeView === 'admin' ? 'page' : undefined}
          >
            <ShieldCheck className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeView === 'admin' ? 'text-[#e50914]' : 'text-slate-500'}`} />
            <span>Admin Panel</span>
          </button>
        </nav>

      </div>
    </header>
  );
}
