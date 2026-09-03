import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ClientPortal from './components/ClientPortal';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import { isConfigured } from './supabaseClient';

export default function App() {
  const [activeView, setActiveView] = useState(() => {
    // If URL has ?view=admin, open admin, otherwise default to client
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'admin' ? 'admin' : 'client';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [key, setKey] = useState(0); // Trigger re-render on config changes

  const handleConfigSaved = () => {
    setKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-[#e50914] selection:text-white" key={key}>
      {/* Top Navigation Bar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content View */}
      <main className="flex-1">
        {activeView === 'client' ? (
          <ClientPortal onOpenAdmin={() => setActiveView('admin')} />
        ) : (
          <AdminDashboard onOpenSettings={() => setIsSettingsOpen(true)} />
        )}
      </main>

      {/* Database Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={handleConfigSaved}
      />
    </div>
  );
}
