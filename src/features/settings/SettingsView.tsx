'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, Wallet, Cpu, Server, Shield, Bell, CreditCard, Trash2, ExternalLink, ChevronRight, Key, Copy, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WalletData {
  did: string;
  privateKeyHex: string;
  seedPhrase?: string;
  address?: string;
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  
  const [showPhrase, setShowPhrase] = useState(false);
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);
  const [copiedPrivKey, setCopiedPrivKey] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('kickpay_fan_wallet');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        setTimeout(() => setWallet(parsed), 0);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleReset = () => {
    if (confirm("Are you sure? This will delete your keys from this device. If you haven't backed up your recovery phrase, you will lose your funds permanently.")) {
      localStorage.removeItem('kickpay_fan_wallet');
      window.location.reload();
    }
  };

  const copyText = (text: string, type: 'phrase' | 'priv') => {
    navigator.clipboard.writeText(text);
    if (type === 'phrase') {
      setCopiedPhrase(true);
      setTimeout(() => setCopiedPhrase(false), 2000);
    } else {
      setCopiedPrivKey(true);
      setTimeout(() => setCopiedPrivKey(false), 2000);
    }
  };

  const tabs = [
    { id: 'wallet', label: 'Wallets & Keys', icon: Wallet },
    { id: 'security', label: 'Security & Backup', icon: Shield },
    { id: 'runtime', label: 'Pear Runtime', icon: Cpu },
    { id: 'network', label: 'P2P Mesh Network', icon: Server },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto h-full min-h-[70vh] font-sans">
      
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-64 shrink-0 space-y-2">
        <h2 className="text-xl font-heading font-bold text-slate-900 px-4 mb-6 flex items-center gap-2">
          <Settings size={20} />
          Settings
        </h2>
        
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all font-bold text-sm whitespace-nowrap lg:whitespace-normal group relative overflow-hidden ${
                  isActive 
                    ? 'text-slate-900 bg-slate-100 shadow-sm border border-slate-200' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <Icon size={18} className={isActive ? 'text-[#3B82F6]' : 'text-slate-400 group-hover:text-[#3B82F6]'} />
                  {tab.label}
                </div>
                {isActive && <ChevronRight size={16} className="relative z-10 text-slate-400 hidden lg:block" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-[32px] overflow-hidden relative shadow-lg border border-slate-200">
        <AnimatePresence mode="wait">
          
          {activeTab === 'wallet' && (
            <motion.div 
              key="wallet"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-8 space-y-8 h-full overflow-y-auto scrollbar-thin"
            >
              <div>
                <h3 className="text-2xl font-heading font-bold text-slate-900 mb-2">Wallets & Keys</h3>
                <p className="text-slate-500 text-sm font-medium">Manage your decentralized identities and cryptographic keys.</p>
              </div>

              <div className="space-y-6">
                
                {/* Fan Wallet Settings */}
                <div className="p-6 rounded-[24px] bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center shrink-0 border border-primary-green/20">
                      <CreditCard size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-lg">Fan Identity</h4>
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mt-1">Offline DID</p>
                      <p className="text-sm text-slate-700 font-mono">
                        {wallet ? wallet.did : 'No wallet loaded'}
                      </p>
                      {wallet?.address && (
                        <>
                          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mt-3">Liquid Address</p>
                          <div className="flex items-center gap-2">
                            <p className="text-blue-600 text-sm font-mono bg-blue-50 py-1 px-3 rounded-md">
                              {wallet.address}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button onClick={() => setActiveTab('security')} className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 text-sm font-bold transition-all shadow-sm">
                      Security & Backup
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-[24px] border border-amber-200 bg-amber-50 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center">
                  <div>
                    <h4 className="font-bold text-amber-900 text-lg flex items-center gap-2">
                      <Shield size={20} /> Reset Wallet
                    </h4>
                    <p className="text-sm text-amber-700 mt-1 max-w-xl font-medium">
                      This will remove the wallet from this device. Make sure you have your 12-word recovery phrase backed up first.
                    </p>
                  </div>
                  <button onClick={handleReset} className="px-5 py-2.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold transition-colors flex items-center justify-center gap-2 shrink-0 border border-red-200">
                    <Trash2 size={16} /> Reset Wallet
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div 
              key="security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-8 space-y-8 h-full overflow-y-auto scrollbar-thin"
            >
              <div>
                <h3 className="text-2xl font-heading font-bold text-slate-900 mb-2">Security & Backup</h3>
                <p className="text-slate-500 text-sm font-medium">Export and back up your cryptographic identity.</p>
              </div>

              {!wallet && (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-500">No wallet found.</div>
              )}

              {wallet && (
                <div className="space-y-6">
                  {wallet.seedPhrase && (
                    <div className="bg-slate-50 border border-slate-200 rounded-[24px] overflow-hidden">
                      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                            <Key size={18} className="text-[#3B82F6]" /> Secret Recovery Phrase
                          </h4>
                          <p className="text-xs font-medium text-slate-500 mt-1">Anyone with this phrase can steal your funds.</p>
                        </div>
                        <button 
                          onClick={() => {
                            if (showPhrase) {
                              setShowPhrase(false);
                            } else {
                              if (confirm("WARNING: Anyone with this recovery phrase can control your wallet and steal your funds. Are you sure you want to reveal it?")) {
                                setShowPhrase(true);
                              }
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-900 flex items-center gap-2 transition-colors border border-slate-200"
                        >
                          {showPhrase ? <><EyeOff size={16}/> Hide</> : <><Eye size={16}/> Reveal</>}
                        </button>
                      </div>
                      
                      {showPhrase && (
                        <div className="p-6 space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            {wallet.seedPhrase.split(' ').map((word: string, idx: number) => (
                              <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 shadow-sm">
                                <span className="text-slate-400 text-[10px] font-mono">{idx + 1}</span>
                                <span className="font-bold text-sm text-slate-900">{word}</span>
                              </div>
                            ))}
                          </div>
                          <button 
                            onClick={() => copyText(wallet.seedPhrase!, 'phrase')}
                            className="w-full flex items-center justify-center gap-2 text-[#3B82F6] font-bold text-sm hover:text-[#2563EB] transition-colors py-2 bg-[#3B82F6]/10 rounded-xl"
                          >
                            {copiedPhrase ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            {copiedPhrase ? 'Copied' : 'Copy Phrase'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-slate-50 border border-slate-200 rounded-[24px] overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                          <Key size={18} className="text-primary-green" /> Private Key
                        </h4>
                        <p className="text-xs font-medium text-slate-500 mt-1">Raw cryptographic ECDSA private key.</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (showPrivKey) {
                            setShowPrivKey(false);
                          } else {
                            if (confirm("WARNING: Anyone with this private key can control your wallet and steal your funds. Are you sure you want to reveal it?")) {
                              setShowPrivKey(true);
                            }
                          }
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-900 flex items-center gap-2 transition-colors border border-slate-200"
                      >
                        {showPrivKey ? <><EyeOff size={16}/> Hide</> : <><Eye size={16}/> Reveal</>}
                      </button>
                    </div>
                    
                    {showPrivKey && (
                      <div className="p-6 space-y-4">
                        <div className="bg-slate-900 text-slate-300 font-mono text-xs p-4 rounded-xl break-all shadow-inner">
                          {wallet.privateKeyHex}
                        </div>
                        <button 
                          onClick={() => copyText(wallet.privateKeyHex, 'priv')}
                          className="w-full flex items-center justify-center gap-2 text-primary-green font-bold text-sm hover:text-[#1B7559] transition-colors py-2 bg-primary-green/10 rounded-xl"
                        >
                          {copiedPrivKey ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                          {copiedPrivKey ? 'Copied' : 'Copy Private Key'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'runtime' && (
            <motion.div 
              key="runtime"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-8 space-y-8 h-full overflow-y-auto scrollbar-thin flex flex-col items-center justify-center text-center"
            >
              <div className="w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <Cpu size={48} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-heading font-bold text-slate-900">Pear Runtime</h3>
              <p className="text-slate-500 font-medium text-sm max-w-md">
                Pear Runtime enables true native P2P capabilities and filesystem access. Since you are running in a browser, this feature is emulated.
              </p>
              <a 
                href="https://holepunch.to" 
                target="_blank" 
                rel="noreferrer"
                className="mt-4 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                Learn about Pear <ExternalLink size={16} />
              </a>
            </motion.div>
          )}

          {/* Placeholder for other tabs */}
          {['network', 'notifications'].includes(activeTab) && (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="p-8 space-y-8 h-full flex flex-col items-center justify-center text-center opacity-50"
            >
              <Server size={48} className="text-slate-400 mb-4" strokeWidth={1} />
              <h3 className="text-2xl font-heading font-bold text-slate-900 capitalize">{activeTab} Settings</h3>
              <p className="text-slate-500 font-medium text-sm max-w-md">
                This section is currently under development. Check back later for updates.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
