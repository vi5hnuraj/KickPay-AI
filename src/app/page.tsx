'use client';

import React, { useState, useEffect } from 'react';
import WalletSetup from '../features/wallet/WalletSetup';
import DashboardView from '../features/dashboard/DashboardView';
import MerchantPOSView from '../features/merchant/MerchantPOSView';
import TicketsView from '../features/tickets/TicketsView';
import PaymentsView from '../features/payments/PaymentsView';
import SettlementView from '../features/settlement/SettlementView';
import SettingsView from '../features/settings/SettingsView';
import AIAssistantView from '../features/ai/AIAssistantView';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Store,
  Ticket,
  Receipt,
  BrainCircuit,
  Handshake,
  Settings,
  ChevronRight,
  LogOut,
  Bell,
  Globe2,
  ShieldCheck
} from 'lucide-react';

type DashboardTab = 'dashboard' | 'wallet' | 'merchant' | 'tickets' | 'payments' | 'ai' | 'settlement' | 'settings';

const TABS: { id: DashboardTab; label: string; Icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'wallet', label: 'Wallet', Icon: Wallet },
  { id: 'merchant', label: 'Merchant POS', Icon: Store },
  { id: 'tickets', label: 'Tickets', Icon: Ticket },
  { id: 'payments', label: 'Payments', Icon: Receipt },
  { id: 'ai', label: 'AI Assistant', Icon: BrainCircuit },
  { id: 'settlement', label: 'Settlement', Icon: Handshake },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export default function Home() {
  const [wallet, setWallet] = useState<{ did: string; usdt?: number; points?: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('dashboard');

  useEffect(() => {
    let isMounted = true;
    setTimeout(() => {
      if (isMounted) setMounted(true);
    }, 50);
    const data = localStorage.getItem('kickpay_fan_wallet');
    if (data && isMounted) {
      setTimeout(() => {
        setWallet(JSON.parse(data));
      }, 50);
    }
    return () => { isMounted = false; };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-12 h-12 rounded-full bg-primary-green/20 border border-primary-green/50 flex items-center justify-center shadow-[0_0_30px_rgba(38,161,123,0.3)]"
        >
          <div className="w-4 h-4 bg-primary-green rounded-full shadow-[0_0_15px_#26A17B]" />
        </motion.div>
      </div>
    );
  }

  // LANDING PAGE (NO WALLET)
  if (!wallet) {
    return (
      <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col font-sans overflow-x-hidden">
        {/* Glassmorphic Navbar */}
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto glass-dark rounded-full px-6 py-3 flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-green to-[#1B7559] flex items-center justify-center shadow-lg shadow-primary-green/20">
                <span className="text-white font-heading font-bold text-lg">K</span>
              </div>
              <span className="font-heading font-bold text-xl tracking-tight text-white">
                KickPay<span className="text-primary-green"> AI</span>
              </span>
            </div>
            <button
              onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm bg-primary-green hover:bg-[#1B7559] text-white font-medium px-5 py-2 rounded-full transition-all duration-300 shadow-md shadow-primary-green/20 hover:shadow-primary-green/40 active:scale-95"
            >
              Get Started
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative pt-40 pb-20 px-6 flex items-center justify-center min-h-[85vh]">
          {/* Ambient background glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-green/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#22C55E]/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
          
          <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-green/30 bg-primary-green/10 text-xs font-mono text-primary-green font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-primary-green animate-pulse shadow-[0_0_8px_#26A17B]" />
              Pear Runtime Activated
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-8xl font-heading font-extrabold tracking-tight leading-[1.05] text-white"
            >
              The Future of <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-green to-[#22C55E]">
                Stadium Commerce.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-text-secondary leading-relaxed max-w-2xl font-medium"
            >
              An offline-first, cryptographic payment network for stadiums, merchants, and fans. No central servers. Zero latency. Total sovereignty.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-4 pt-6"
            >
              <button
                onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}
                className="group relative flex items-center gap-2 bg-primary-green text-white font-semibold px-8 py-4 rounded-full transition-all shadow-[0_0_20px_rgba(38,161,123,0.3)] hover:shadow-[0_0_30px_rgba(38,161,123,0.5)] hover:-translate-y-0.5 active:translate-y-0"
              >
                Launch Wallet
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </section>

        {/* Premium Features Grid */}
        <section className="py-24 px-6 bg-secondary relative z-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-dark p-8 rounded-[24px] space-y-6 hover:border-primary-green/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-green/10 border border-primary-green/20 flex items-center justify-center text-primary-green group-hover:scale-110 transition-transform">
                <Globe2 size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold text-white mb-2">Mesh Swarm</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Connect peer-to-peer via local networks. Automatic ledger synchronization ensures merchants never miss a payment.
                </p>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-dark p-8 rounded-[24px] space-y-6 hover:border-accent/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold text-white mb-2">Self-Custodial</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Decentralized Identifiers cryptographically generated on-device. You own your signatures and transaction history.
                </p>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="glass-dark p-8 rounded-[24px] space-y-6 hover:border-[#22C55E]/50 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E] group-hover:scale-110 transition-transform">
                <BrainCircuit size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-heading font-bold text-white mb-2">QVAC AI</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  On-device analytical assessment. Prevent fraud and generate spending insights without leaking customer data.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Wallet Generation Workspace */}
        <section id="workspace" className="py-32 px-6">
          <div className="max-w-2xl mx-auto space-y-10">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-heading font-bold text-white">Initialize Workspace</h2>
              <p className="text-text-secondary">Generate new cryptographic keys to enter the ecosystem.</p>
            </div>
            
            <div className="glass-dark p-8 rounded-[32px] border border-border-dark/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-green/5 blur-[100px] rounded-full pointer-events-none" />
              <WalletSetup onWalletLoaded={(w) => setWallet(w)} />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border-dark/20 bg-secondary py-8 text-center text-sm text-text-secondary mt-auto">
          <p>&copy; 2026 KickPay AI. Built for Tether Developers Cup 2026. Offline &amp; Sovereign.</p>
        </footer>
      </div>
    );
  }

  // AUTHENTICATED DASHBOARD WORKSPACE
  return (
    <div className="min-h-screen bg-bg-dark text-text-primary flex flex-col font-sans">
      {/* Premium Dashboard Navbar */}
      <header className="sticky top-0 z-50 bg-bg-dark/80 backdrop-blur-xl border-b border-border-dark/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-green to-[#1B7559] flex items-center justify-center shadow-md shadow-primary-green/20">
              <span className="text-white font-heading font-bold text-sm">K</span>
            </div>
            <span className="font-heading font-bold text-lg text-white">KickPay</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary-green animate-pulse shadow-[0_0_8px_#26A17B]" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-widest">Network Active</span>
            </div>
            
            <div className="h-6 w-px bg-border-dark/50 hidden md:block" />

            <div className="flex items-center gap-3 bg-secondary px-4 py-1.5 rounded-full border border-border-dark/30">
              <Wallet size={14} className="text-primary-green" />
              <span className="text-xs font-mono text-white/90">
                {wallet.did.slice(0, 8)}...{wallet.did.slice(-4)}
              </span>
            </div>

            <button className="relative p-2 text-text-secondary hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-bg-dark" />
            </button>

            <button
              onClick={() => {
                localStorage.removeItem('kickpay_fan_wallet');
                localStorage.removeItem('kickpay_merchant_wallet');
                localStorage.removeItem('kickpay_organizer_wallet');
                setWallet(null);
                window.location.reload();
              }}
              className="p-2 text-text-secondary hover:text-destructive transition-colors rounded-full hover:bg-destructive/10"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="sticky top-24 space-y-2">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-green text-white shadow-md shadow-primary-green/20'
                      : 'text-text-secondary hover:text-white hover:bg-secondary border border-transparent hover:border-border-dark/30'
                  }`}
                >
                  <tab.Icon size={18} className={isActive ? 'text-white' : 'text-text-secondary'} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Content Area */}
        <section className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full h-full"
            >
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'wallet' && <WalletSetup onWalletLoaded={(w) => setWallet(w)} />}
              {activeTab === 'merchant' && <MerchantPOSView />}
              {activeTab === 'tickets' && <TicketsView />}
              {activeTab === 'payments' && <PaymentsView />}
              {activeTab === 'ai' && <AIAssistantView />}
              {activeTab === 'settlement' && <SettlementView />}
              {activeTab === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
