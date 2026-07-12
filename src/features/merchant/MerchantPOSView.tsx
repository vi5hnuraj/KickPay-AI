/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ReceiptService, OfflineSyncService, WalletService, PaymentService } from '@/lib/kickpay-core';
import { Transaction, Receipt, PaymentRequest } from '@/lib/shared-types';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Activity,
  HardDrive,
  Database,
  Copy,
  Terminal,
  ShieldCheck,
  Network
} from 'lucide-react';

export default function MerchantPOSView() {
  const [merchantWallet, setMerchantWallet] = useState<{ did: string; privateKeyHex: string; usdt?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initStep, setInitStep] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('Not synchronized yet');

  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<{ id: string; ticker: string; name: string }>({
    id: 'b612eb46313a2cd6ebabd8b7a8eed5696e29898b87a43bff41c94f51acef9d73',
    ticker: 'L-USDT',
    name: 'Tether USD'
  });
  const [status, setStatus] = useState<'idle' | 'waiting' | 'handshake_received' | 'verifying' | 'receipt_generated' | 'error'>('idle');
  const [lastTx, setLastTx] = useState<Transaction | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copiedDid, setCopiedDid] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<PaymentRequest | null>(null);
  const currentRequestRef = useRef<PaymentRequest | null>(null);
  const [paymentUri, setPaymentUri] = useState<string>('');

  // Real queues / history
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([]);

  const fetchBalance = async (did: string) => {
    try {
      const bal = await WalletService.getBalance(did);
      setMerchantWallet(prev => prev ? { ...prev, ...bal } : null);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setMerchantWallet(prev => prev ? { ...prev, usdt: undefined } : null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const data = localStorage.getItem('kickpay_merchant_wallet');
    if (data && isMounted) {
      try {
        const parsed = JSON.parse(data);
        setTimeout(() => setMerchantWallet(parsed), 0);
        setTimeout(() => fetchBalance(parsed.did), 0);
      } catch {}
    }
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!merchantWallet) return;

    // Listen to real offline transactions
    OfflineSyncService.receiveReplicatedTransactions(async (data: any) => {
      if (data.type === 'transaction' && data.data.receiverWallet === merchantWallet.did) {
        const tx = data.data as Transaction;
        const activeReq = currentRequestRef.current;
        
        // Ensure this transaction matches our currently active session
        if (!activeReq || tx.sessionId !== activeReq.sessionId) return;
        
        setLastTx(tx);
        setRecentTransactions(prev => [tx, ...prev].slice(0, 50));
        setStatus('verifying');

        try {
          const generatedReceipt = await ReceiptService.processIncomingTransaction(
            tx,
            merchantWallet.did,
            merchantWallet.privateKeyHex
          );
          
          setReceipt(generatedReceipt);
          setRecentReceipts(prev => [generatedReceipt, ...prev].slice(0, 50));
          setStatus('receipt_generated');

          setTimeout(() => {
            setStatus('idle');
            setAmount('');
            setLastTx(null);
            setReceipt(null);
            setCurrentRequest(null);
            currentRequestRef.current = null;
          }, 5000);
        } catch (err: any) {
          console.error("Receipt error:", err);
          setStatus('error');
          setTimeout(() => {
            setStatus('idle');
            setAmount('');
            setCurrentRequest(null);
            currentRequestRef.current = null;
          }, 5000);
        }
      } else if (data.type === 'payment_handshake' && data.data.merchantDid === merchantWallet.did) {
        const handshake = data.data as any; // Type is PaymentSessionHandshake
        const activeReq = currentRequestRef.current;
        if (activeReq && activeReq.sessionId === handshake.sessionId) {
          // Change status to reflect handshake received
          setStatus('handshake_received' as any);
          
          // Add target DID
          const targetedReq = { ...activeReq, targetDid: handshake.customerDid };
          OfflineSyncService.sendPaymentRequest(targetedReq).catch(console.error);
        }
      }
    });
  }, [merchantWallet]);

  const handleCreateMerchant = async () => {
    setLoading(true);
    setInitStep(1); // Creating Merchant Identity
    try {
      await new Promise(r => setTimeout(r, 600));
      setInitStep(2); // Preparing Merchant Wallet
      const nw = await WalletService.createWallet('merchant');

      await new Promise(r => setTimeout(r, 600));
      setInitStep(3); // Initializing Offline Payment Engine
      const balances = await WalletService.getBalance(nw.did);

      await new Promise(r => setTimeout(r, 600));
      setInitStep(4); // Starting Mesh Runtime

      await new Promise(r => setTimeout(r, 600));
      setInitStep(5); // Merchant Ready

      const wallet = { ...nw, ...balances };
      localStorage.setItem('kickpay_merchant_wallet', JSON.stringify(wallet));
      setTimeout(() => {
        setMerchantWallet(wallet);
        setLastUpdated(new Date().toLocaleTimeString());
      }, 500);
    } catch (err) {
      console.error(err);
      setInitStep(0);
    } finally {
      setLoading(false);
    }
  };

  const handleKeypad = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    setAmount(prev => prev + num);
  };

  const handleDelete = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleGenerateRequest = async () => {
    if (!merchantWallet || !amount) return;
    
    try {
      const { request, uri } = PaymentService.createPaymentRequest(
        merchantWallet.did,
        parseFloat(amount),
        selectedAsset.id,
        selectedAsset.ticker,
        selectedAsset.name
      );
      setCurrentRequest(request);
      currentRequestRef.current = request;
      setPaymentUri(uri);
      setStatus('waiting');
      
      // DO NOT broadcast the request yet. We wait for the customer to scan the QR and send a handshake.
    } catch (e) {
      console.error('Failed to generate request', e);
    }
  };

  const handleCancelRequest = () => {
    setStatus('idle');
    setCurrentRequest(null);
    currentRequestRef.current = null;
    setPaymentUri('');
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  const handleRetryBalance = () => {
    if (merchantWallet && merchantWallet.did) {
      fetchBalance(merchantWallet.did);
    }
  };

  const handleResetMerchant = () => {
    if (window.confirm("Are you sure you want to completely reset this merchant node? All local keys will be wiped.")) {
      localStorage.removeItem('kickpay_merchant_wallet');
      setMerchantWallet(null);
      setAmount('');
      setStatus('idle');
      setRecentTransactions([]);
      setRecentReceipts([]);
    }
  };

  // ========================================================
  // STATE 1: BEFORE INITIALIZATION
  // ========================================================
  if (!merchantWallet) {
    return (
      <div className="max-w-2xl mx-auto space-y-8 font-sans mt-10">

        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-heading font-bold text-slate-900">Merchant POS</h1>
              <p className="text-slate-500 mt-2 font-medium">Accept offline USDT payments over the KickPay mesh network.</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <Store size={24} className="text-blue-600" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">Status</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <p className="font-semibold text-slate-700">Merchant not initialized</p>
            </div>
            <p className="text-sm text-slate-500">This device has not yet been configured as a merchant payment terminal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Benefits</p>
              <ul className="space-y-3">
                {['Offline payments', 'Automatic settlement', 'Cryptographic receipts', 'Self-custodial wallet', 'Mesh synchronization'].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Architecture</p>
              <ul className="space-y-3">
                {['WDK', 'Pear', 'QVAC', 'Offline Mesh'].map((arch, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <Database size={16} className="text-blue-500" />
                    {arch}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {!loading ? (
            <button
              onClick={handleCreateMerchant}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
            >
              Initialize Merchant
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-4">Initialization Progress</p>
              <ul className="space-y-3">
                {[
                  'Creating Merchant Identity',
                  'Preparing Merchant Wallet',
                  'Initializing Offline Payment Engine',
                  'Starting Mesh Runtime',
                  'Merchant Ready'
                ].map((stepText, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm font-medium">
                    {initStep > idx + 1 ? (
                      <CheckCircle2 size={18} className="text-emerald-500" />
                    ) : initStep === idx + 1 ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full ml-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-200 ml-0.5" />
                    )}
                    <span className={initStep >= idx + 1 ? 'text-slate-900' : 'text-slate-400'}>{stepText}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && (
            <div className="mt-6">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">What happens next</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
                <li>Create Merchant Identity</li>
                <li>Prepare Merchant Wallet</li>
                <li>Initialize Offline Payment Engine</li>
                <li>Start Mesh Runtime</li>
                <li>Merchant Ready</li>
              </ol>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ========================================================
  // STATE 2: AFTER INITIALIZATION (MERCHANT POS DASHBOARD)
  // ========================================================
  const truncateDid = (did: string) => did ? `${did.slice(0, 16)}...${did.slice(-4)}` : 'Unavailable';

  return (
    <div className="space-y-6 font-sans pb-10 max-w-7xl mx-auto">

      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950 text-white rounded-[16px] shadow-sm border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Store size={24} className="text-blue-400" />
            Merchant POS
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Ready</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Current Balance</p>
            <div className="flex items-center gap-3">
              {merchantWallet.usdt !== undefined ? (
                <span className="text-3xl font-bold font-mono">
                  {merchantWallet.usdt.toFixed(2)}
                  <span className="text-lg text-slate-400 ml-1">USDT</span>
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-400">Balance unavailable</span>
              )}
              <button onClick={handleRetryBalance} className="text-slate-500 hover:text-white transition-colors" title="Refresh">
                <RefreshCw size={14} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Last Sync: {lastUpdated}</p>
          </div>

          <div className="hidden md:block w-px h-12 bg-slate-800"></div>

          <div>
            <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Merchant DID</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-200">{truncateDid(merchantWallet.did)}</span>
              <button onClick={() => handleCopy(merchantWallet.did)} className="text-slate-500 hover:text-white transition-colors">
                {copiedDid ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* MAIN PAYMENT PANEL (Left) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-8 min-h-[550px] flex flex-col justify-center relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {status === 'idle' && (
                <motion.div
                  key="keypad"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm mx-auto flex flex-col items-center"
                >
                  <p className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-4">Charge Amount</p>
                  
                  {/* Asset Selector */}
                  <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg w-full">
                    <button
                      type="button"
                      onClick={() => setSelectedAsset({
                        id: 'b612eb46313a2cd6ebabd8b7a8eed5696e29898b87a43bff41c94f51acef9d73',
                        ticker: 'L-USDT',
                        name: 'Tether USD'
                      })}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedAsset.ticker === 'L-USDT' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      L-USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAsset({
                        id: '144c654344aa716d6f3abcc1ca90e5641e4e2a7f633bc09fe3baf64585819a49',
                        ticker: 'L-BTC',
                        name: 'Liquid Bitcoin'
                      })}
                      className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${selectedAsset.ticker === 'L-BTC' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      L-BTC
                    </button>
                  </div>

                  <div className="text-5xl font-mono font-bold text-slate-900 tracking-tighter h-20 flex items-center justify-center mb-8">
                    {amount || (selectedAsset.ticker === 'L-BTC' ? '0.00000000' : '0.00')} <span className="text-2xl text-slate-400 ml-2">{selectedAsset.ticker}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 w-full mb-8">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleKeypad(num)}
                        className="h-16 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-2xl font-mono font-medium text-slate-900 transition-colors flex items-center justify-center"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={handleDelete}
                      className="h-16 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-xl font-medium text-slate-500 transition-colors flex items-center justify-center"
                    >
                      DEL
                    </button>
                  </div>

                  <button
                    onClick={handleGenerateRequest}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="w-full h-16 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold text-lg transition-colors shadow-md flex items-center justify-center gap-2"
                  >
                    <QrCode size={20} />
                    Generate Payment Request
                  </button>
                </motion.div>
              )}

              {(status === 'waiting' || status === 'handshake_received') && currentRequest && (
                <motion.div 
                  key="waiting"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center text-center w-full max-w-md mx-auto"
                >
                  <h3 className="text-xl font-heading font-bold text-slate-900 mb-6">Payment Request Created</h3>
                  
                  <div className="w-full bg-slate-50 rounded-2xl p-8 border border-slate-200 mb-6 flex flex-col items-center justify-center">
                    <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 transition-all ${status === 'handshake_received' ? 'opacity-50 blur-sm' : ''}`}>
                      <QRCodeSVG value={paymentUri} size={200} level="H" />
                    </div>
                    <div className="text-4xl font-mono font-bold text-slate-900 mb-2">{amount} <span className="text-xl text-slate-400">{selectedAsset.ticker}</span></div>
                    <div className="text-xs font-mono text-slate-500 mt-2 bg-slate-200 px-3 py-1 rounded-full">{currentRequest.requestId}</div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-600 mb-6 bg-blue-50 text-blue-800 px-4 py-3 rounded-xl w-full justify-center border border-blue-100">
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="font-medium text-sm">
                      {status === 'handshake_received' ? 'Handshake received, waiting for payment...' : 'Waiting for customer to scan QR'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full justify-center">
                    <button
                      onClick={handleCancelRequest}
                      className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors py-2 px-4 border border-slate-200 rounded-lg"
                    >
                      Cancel Request
                    </button>
                    <button
                      onClick={() => handleCopy(paymentUri)}
                      className="text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-900 transition-colors py-2 px-4 rounded-lg flex items-center gap-2"
                    >
                      {copiedDid ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      Copy URI
                    </button>
                  </div>
                </motion.div>
              )}

              {status === 'verifying' && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center space-y-6"
                >
                  <RefreshCw size={40} className="text-blue-500 animate-spin" />
                  <div>
                    <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">Verifying Cryptography</h3>
                    <p className="text-slate-500 text-sm">Validating local P-256 signature...</p>
                  </div>
                </motion.div>
              )}

              {status === 'receipt_generated' && receipt && lastTx && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center text-center w-full max-w-sm mx-auto"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h3 className="text-2xl font-heading font-bold text-slate-900 mb-1">Payment Approved</h3>
                  <p className="text-slate-500 text-sm mb-8">Receipt cryptographically secured offline.</p>

                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                      <span className="text-slate-500 text-xs">Amount Paid</span>
                      <span className="text-xl font-mono font-bold text-slate-900">{lastTx.amount} {lastTx.assetTicker || lastTx.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Customer DID</span>
                      <span className="text-slate-900 font-mono text-xs truncate max-w-[140px]">{lastTx.senderWallet}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 text-xs">Receipt ID</span>
                      <span className="text-blue-600 font-mono text-xs truncate max-w-[140px]">{receipt.receiptId}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle size={40} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">Payment Failed</h3>
                    <p className="text-slate-500 text-sm">Signature verification failed. Please try again.</p>
                  </div>
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors"
                  >
                    Return to POS
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

          {/* MERCHANT INFORMATION & QUICK ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Terminal size={16} className="text-slate-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Merchant Information</h3>
              </div>
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 text-slate-500 text-xs">Merchant DID</td>
                    <td className="py-2 text-slate-900 font-mono text-xs text-right truncate max-w-[100px]">{truncateDid(merchantWallet.did)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 text-slate-500 text-xs">Wallet Type</td>
                    <td className="py-2 text-slate-900 text-xs text-right">Merchant Node</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2 text-slate-500 text-xs">Node Status</td>
                    <td className="py-2 text-emerald-600 font-medium text-xs text-right">Active</td>
                  </tr>
                </tbody>
              </table>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-slate-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleRetryBalance} className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-slate-700 text-xs font-medium flex flex-col justify-center items-center gap-1 transition-colors">
                  <RefreshCw size={14} /> Refresh Balance
                </button>
                <button onClick={() => handleCopy(merchantWallet.did)} className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-slate-700 text-xs font-medium flex flex-col justify-center items-center gap-1 transition-colors">
                  <Copy size={14} /> Copy DID
                </button>
                <button onClick={handleResetMerchant} className="col-span-2 p-3 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg text-red-700 text-xs font-medium flex justify-center items-center gap-2 transition-colors">
                  <AlertCircle size={14} /> Reset Merchant Node
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT COLUMN: QUEUES & LOGS */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* PAYMENT QUEUE */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[16px] border border-slate-200 shadow-sm flex flex-col h-[280px]"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Payment Queue</h3>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
              {recentTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <HardDrive size={32} className="opacity-20" />
                  <p className="text-sm font-medium text-slate-600">No pending payment requests.</p>
                  <p className="text-xs">Waiting for first customer</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((tx, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-xs font-mono font-bold text-slate-900 truncate max-w-[120px]">{tx.id}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{tx.senderWallet}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-mono text-blue-600">{tx.amount} USDT</p>
                        <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 justify-end"><CheckCircle2 size={10} /> Received</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* RECENT PAYMENTS (Receipts) */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[16px] border border-slate-200 shadow-sm flex flex-col h-[280px]"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-500" />
                <h3 className="font-semibold text-slate-900 text-sm">Recent Payments</h3>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50">
              {recentReceipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <Database size={32} className="opacity-20" />
                  <p className="text-sm font-medium text-slate-600">No completed payments yet.</p>
                  <p className="text-xs">Merchant ready to accept payments</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentReceipts.map((rec, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                      <div>
                        <p className="text-xs font-mono text-slate-900 truncate max-w-[120px]">{rec.receiptId}</p>
                        <p className="text-[10px] text-slate-500">Status: <span className="text-amber-600 font-medium">Awaiting settlement</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold font-mono text-slate-700">{rec.amount} USDT</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* SETTLEMENT & MESH */}
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center text-center h-32"
            >
              <Database size={20} className="text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">No settlements pending.</p>
              <p className="text-[10px] text-slate-400 mt-1">Everything is synchronized</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-4 flex flex-col items-center justify-center text-center h-32"
            >
              <Network size={20} className="text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">Connection status unavailable</p>
            </motion.div>
          </div>

        </div>

      </div>
    </div>
  );
}
