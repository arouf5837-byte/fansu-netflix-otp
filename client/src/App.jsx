import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ClientPortal from './components/ClientPortal';
import AdminDashboard from './components/AdminDashboard';
import SettingsModal from './components/SettingsModal';
import AnimatedBackground from './components/AnimatedBackground';

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
    <div className="relative min-h-screen flex flex-col text-slate-900 selection:bg-[#e50914] selection:text-white overflow-x-hidden font-sans" key={key}>
      {/* Ultra-Premium Dynamic Animated Background */}
      <AnimatedBackground />

      {/* Sticky Floating Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content View with Smooth Transitions */}
      <main className="flex-1 flex flex-col relative z-10">
        {activeView === 'client' ? (
          <ClientPortal onOpenAdmin={() => setActiveView('admin')} />
        ) : (
          <AdminDashboard onOpenSettings={() => setIsSettingsOpen(true)} />
        )}
      </main>

      {/* Database Settings Modal (Maintained for DB configuration if opened from Admin) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigSaved={handleConfigSaved}
      />
    </div>
  );
}
