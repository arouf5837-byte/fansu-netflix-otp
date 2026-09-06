import React from 'react';
import { ShieldCheck, User } from 'lucide-react';

export default function Navbar({ activeView, setActiveView }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button type="button" className="brand" onClick={() => setActiveView('client')} aria-label="Learnory Digital home">
          <span className="brand-mark">LD</span>
          <span className="brand-name">LEARNORY <b>DIGITAL</b></span>
        </button>
        <nav className="view-switcher" aria-label="Main navigation">
          <button type="button" className={activeView === 'client' ? 'active' : ''} onClick={() => setActiveView('client')} aria-current={activeView === 'client' ? 'page' : undefined}>
            <User size={15} /><span>Client</span>
          </button>
          <button type="button" className={activeView === 'admin' ? 'active' : ''} onClick={() => setActiveView('admin')} aria-current={activeView === 'admin' ? 'page' : undefined}>
            <ShieldCheck size={15} /><span>Admin</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
