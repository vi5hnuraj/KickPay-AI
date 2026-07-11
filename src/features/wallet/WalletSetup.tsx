'use client';

import React, { useState, useEffect } from 'react';
import { WalletService } from '@/lib/kickpay-core';
import { Key, ShieldCheck, ArrowDownLeft, ArrowUpRight, Copy, CheckCircle2, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export interface FanWallet {
  did: string;
  privateKeyHex: string;
  publicKeyHex?: string;
  seedPhrase?: string;
  address?: string;
  usdt?: number;
  points?: number;
}

type OnboardingState = 'init' | 'landing' | 'unlock' | 'creating' | 'backup' | 'verify' | 'import' | 'complete';

export default function WalletSetup({ onWalletLoaded }: { onWalletLoaded: (w: FanWallet) => void }) {
  const [step, setStep] = useState<OnboardingState>('init');
  const [wallet, setWallet] = useState<FanWallet | null>(null);

  // Backup & Verify State
  const [tempWallet, setTempWallet] = useState<FanWallet | null>(null);
  const [seedWords, setSeedWords] = useState<string[]>([]);
  const [verifyIndices, setVerifyIndices] = useState<number[]>([]);
  const [verifyAnswers, setVerifyAnswers] = useState<Record<number, string>>({});
  const [verifyError, setVerifyError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedBackup, setSavedBackup] = useState(false);

  // Import State
  const [importPhrase, setImportPhrase] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);

  // 1. Initial check
  useEffect(() => {
    let isMounted = true;
    const data = localStorage.getItem('kickpay_fan_wallet');
    if (data && isMounted) {
      try {
        const parsed = JSON.parse(data);
        setTimeout(() => setWallet(parsed), 0);
        setTimeout(() => setStep('unlock'), 0);
      } catch {
        setTimeout(() => setStep('landing'), 0);
      }
    } else {
      setTimeout(() => setStep('landing'), 0);
    }
    return () => { isMounted = false; };
  }, []);

  const finishOnboarding = (w: FanWallet) => {
    localStorage.setItem('kickpay_fan_wallet', JSON.stringify(w));
    setWallet(w);
    setStep('complete');
    onWalletLoaded(w);
  };

  const [creationStep, setCreationStep] = useState(0);
  const creationSteps = [
    "Generating secure entropy...",
    "Creating recovery phrase...",
    "Deriving wallet keys...",
    "Creating DID...",
    "Checking Liquid balance...",
    "Wallet Ready"
  ];

  // ----------------------------------------------------
  // FLOW: Create Wallet
  // ----------------------------------------------------
  const handleCreateNew = async () => {
    setStep('creating');
    setCreationStep(0);
    try {
      await new Promise(r => setTimeout(r, 400));
      setCreationStep(1);

      const nw = await WalletService.createWallet('fan');

      setCreationStep(2);
      await new Promise(r => setTimeout(r, 400));

      setCreationStep(3);
      await new Promise(r => setTimeout(r, 400));

      setCreationStep(4);
      const balances = await WalletService.getBalance(nw.did);
      const newWallet = { ...nw, ...balances };

      setCreationStep(5);
      await new Promise(r => setTimeout(r, 400));

      setTempWallet(newWallet);

      if (nw.seedPhrase) {
        const words = nw.seedPhrase.split(' ');
        setSeedWords(words);

        // Pick 3 random indices to verify using cryptographic randomness
        const indices: number[] = [];
        const randomValues = new Uint32Array(10);
        globalThis.crypto.getRandomValues(randomValues);
        let i = 0;
        while (indices.length < 3) {
          const r = randomValues[i++] % 12;
          if (!indices.includes(r)) indices.push(r);
        }
        setVerifyIndices(indices.sort((a, b) => a - b));
        setStep('backup');
      } else {
        // Fallback if no seed phrase is generated for some reason
        finishOnboarding(newWallet);
      }
    } catch {
      setTimeout(() => setStep('landing'), 0);
    }
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(seedWords.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    verifyIndices.forEach(idx => {
      if (verifyAnswers[idx]?.trim().toLowerCase() !== seedWords[idx].toLowerCase()) {
        valid = false;
      }
    });

    if (valid && tempWallet) {
      finishOnboarding(tempWallet);
    } else {
      setVerifyError("One or more words are incorrect. Please try again.");
    }
  };

  // ----------------------------------------------------
  // FLOW: Import Wallet
  // ----------------------------------------------------
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImporting(true);

    try {
      const cleaned = importPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
      if (cleaned.split(' ').length !== 12) {
        throw new Error("Secret phrase must be exactly 12 words.");
      }

      // Call our newly added deterministic recovery
      const recovered = await WalletService.recoverWalletFromSeed('fan', cleaned);
      const balances = await WalletService.getBalance(recovered.did);

      finishOnboarding({ ...recovered, ...balances });
    } catch (err: unknown) {
      setImportError((err as Error).message || "Failed to import wallet. Check your seed phrase.");
    } finally {
      setImporting(false);
    }
  };


  // ----------------------------------------------------
  // RENDERERS
  // ----------------------------------------------------

  if (step === 'init') {
    return <div className="flex justify-center py-20"><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-slate-300 border-t-primary-green rounded-full" /></div>;
  }

  if (step === 'unlock' && wallet) {
    return (
      <div className="max-w-md mx-auto text-center space-y-8 mt-10">
        <div className="w-20 h-20 rounded-3xl bg-primary-green/10 flex items-center justify-center mx-auto shadow-inner border border-primary-green/20">
          <ShieldCheck size={40} className="text-primary-green" />
        </div>
        <div>
          <h2 className="text-3xl font-heading font-bold text-slate-900 mb-2">Welcome Back</h2>
          <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">Offline Identity</p>
          <p className="text-slate-700 font-mono text-sm mb-4">
            {wallet.did.slice(0, 16)}...{wallet.did.slice(-4)}
          </p>
          {wallet.address && (
            <>
              <p className="text-slate-500 font-mono text-xs uppercase tracking-wider">Liquid Address</p>
              <p className="text-blue-600 font-mono text-sm bg-blue-50 py-1 px-3 rounded-full inline-block">
                {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => onWalletLoaded(wallet)}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-95 flex justify-center items-center gap-2"
        >
          Continue to Dashboard
          <ArrowUpRight size={20} />
        </button>
      </div>
    );
  }

  if (step === 'landing') {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-green to-[#0f766e] flex items-center justify-center mx-auto shadow-lg shadow-primary-green/20 text-white mb-6">
            <Key size={28} />
          </div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">KickPay AI</h1>
          <p className="text-slate-900 font-bold text-lg">Offline Football Wallet</p>
          <p className="text-slate-500 font-medium text-sm">Powered by WDK, Pear, and QVAC</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCreateNew}
            className="w-full bg-primary-green hover:bg-[#1B7559] text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary-green/20 hover:shadow-primary-green/40 active:scale-[0.98] flex justify-between items-center group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl"><ShieldCheck size={20} /></div>
              <span className="text-lg">Create a new wallet</span>
            </div>
            <ChevronRight size={20} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => setStep('import')}
            className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 font-bold py-4 px-6 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex justify-between items-center group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-xl text-slate-600"><ArrowDownLeft size={20} /></div>
              <span className="text-lg">Import existing wallet</span>
            </div>
            <ChevronRight size={20} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'creating') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-12 h-12 border-4 border-slate-100 border-t-primary-green rounded-full mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Generating Secure Keys</h2>
          <p className="text-slate-500 mt-2 font-mono text-sm">{creationSteps[creationStep]}</p>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="max-w-xl mx-auto space-y-6 mt-6">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-3xl font-heading font-bold text-slate-900">Secret Recovery Phrase</h2>
          <p className="text-slate-600">Write down these 12 words in order. This is the <strong className="text-slate-900">ONLY</strong> way to recover your wallet if you lose access to this device.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-900 space-y-1">
            <p className="font-bold">Never share this phrase with anyone.</p>
            <p className="opacity-90">KickPay support will never ask for it. Anyone with these words can steal your funds.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 relative overflow-hidden group">
          <div className="grid grid-cols-3 gap-x-4 gap-y-4 relative z-10">
            {seedWords.map((word, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <span className="text-slate-400 font-mono text-xs w-4">{idx + 1}.</span>
                <span className="text-slate-900 font-bold text-sm tracking-wide">{word}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center relative z-10">
            <button
              onClick={handleCopyPhrase}
              className="flex items-center gap-2 text-primary-green font-bold text-sm hover:text-[#1B7559] transition-colors px-3 py-2 rounded-lg hover:bg-primary-green/5"
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? 'Copied to clipboard' : 'Copy to clipboard'}
            </button>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={() => setSavedBackup(true)}
            className={`w-full font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-[0.98] flex justify-center items-center gap-2 ${savedBackup ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20' : 'bg-primary-green hover:bg-[#1B7559] text-white shadow-primary-green/20'}`}
          >
            {savedBackup ? (
              <span onClick={(e) => { e.stopPropagation(); setStep('verify'); }} className="flex items-center gap-2 w-full justify-center">
                Continue <ChevronRight size={18} />
              </span>
            ) : (
              "I've written it down"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-8">
        <button onClick={() => setStep('backup')} className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold text-slate-900">Verify Phrase</h2>
          <p className="text-slate-600">Select the correct words from your secret phrase to confirm you saved it.</p>
        </div>

        <form onSubmit={handleVerifySubmit} className="space-y-6">
          {verifyIndices.map((idx) => (
            <div key={idx} className="space-y-2">
              <label className="text-sm font-bold text-slate-900 flex justify-between">
                Word #{idx + 1}
              </label>
              <input
                type="text"
                autoComplete="off"
                value={verifyAnswers[idx] || ''}
                onChange={(e) => setVerifyAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-sm focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none transition-all shadow-sm font-medium text-slate-900"
                placeholder="Enter word"
                required
              />
            </div>
          ))}

          {verifyError && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium flex items-center gap-2">
              <AlertTriangle size={16} />
              {verifyError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-slate-900/20 active:scale-95"
          >
            Verify & Complete
          </button>
        </form>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-8">
        <button onClick={() => setStep('landing')} className="text-slate-500 hover:text-slate-900 flex items-center gap-1 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold text-slate-900">Import Wallet</h2>
          <p className="text-slate-600">Enter your 12-word secret recovery phrase to restore your identity.</p>
        </div>

        <form onSubmit={handleImportSubmit} className="space-y-6">
          <div className="space-y-2">
            <textarea
              value={importPhrase}
              onChange={(e) => setImportPhrase(e.target.value)}
              className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 text-sm focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] outline-none transition-all shadow-sm font-mono text-slate-900 resize-none"
              placeholder="word1 word2 word3..."
              required
            />
          </div>

          {importError && (
            <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              {importError}
            </div>
          )}

          <button
            type="submit"
            disabled={importing}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-[#3B82F6]/20 active:scale-95 flex justify-center items-center gap-2"
          >
            {importing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              "Import Wallet"
            )}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
