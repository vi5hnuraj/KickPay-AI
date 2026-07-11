/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { WalletService, OfflineSyncService } from '@/lib/kickpay-core';
import { motion } from 'framer-motion';
import { 
  Activity,
  Cpu,
  Wallet,
  Server,
  Database,
  CheckCircle2,
  Copy,
  RefreshCw,
  HardDrive,
  Store,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { aiEngineUsed } from '../ai/qvac-service';

export default function DashboardView() {
  const [wallet, setWallet] = useState<{ usdt?: number, points?: number, did: string, address?: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('Not synchronized yet');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [copiedDid, setCopiedDid] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [incomingPaymentRequest, setIncomingPaymentRequest] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  
  const activeSessionIdRef = useRef<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scanUri, setScanUri] = useState('');
  const [handshakeStatus, setHandshakeStatus] = useState<'idle' | 'waiting'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  const fetchBalance = async (did: string, address?: string) => {
    try {
      const bal = await WalletService.getBalance(did);
      setWallet({ ...bal, did, address });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setWallet(prev => prev ? { ...prev, usdt: undefined as any, address } : null);
    }
  };

  useEffect(() => {
    const data = localStorage.getItem('kickpay_fan_wallet');
    if (data) {
      try {
        const fanWallet = JSON.parse(data);
        setTimeout(() => fetchBalance(fanWallet.did, fanWallet.address), 0);
      } catch {}
    }

    OfflineSyncService.receiveReplicatedTransactions((data: any) => {
      const dataWalletDid = localStorage.getItem('kickpay_fan_wallet') ? JSON.parse(localStorage.getItem('kickpay_fan_wallet')!).did : null;
      if (data.type === 'payment_request') {
        const pr = data.data;
        if (
          pr.targetDid === dataWalletDid && 
          pr.sessionId === activeSessionIdRef.current &&
          pr.expiresAt > Date.now()
        ) {
          // It's targeted specifically at us!
          setIncomingPaymentRequest(pr);
          setPaymentStatus('idle');
          setHandshakeStatus('idle'); // Clear handshake status
        }
      } else {
        setRecentActivity(prev => [data, ...prev].slice(0, 50));
      }
    });
  }, []);

  const handlePayRequest = async () => {
    if (!wallet || !incomingPaymentRequest) return;
    setPaymentStatus('signing');
    try {
      const data = localStorage.getItem('kickpay_fan_wallet');
      const fanWallet = JSON.parse(data || '{}');
      const privateKeyHex = fanWallet.privateKeyHex;
      if (!privateKeyHex) throw new Error('Missing private key');

      // Use dynamic import to avoid altering top-level imports aggressively
      const { PaymentService } = await import('@/lib/kickpay-core');
      const tx = await PaymentService.createTransaction(
        wallet.did,
        incomingPaymentRequest.merchantDid,
        incomingPaymentRequest.amount,
        'merchandise',
        privateKeyHex,
        incomingPaymentRequest.sessionId
      );
      
      await OfflineSyncService.broadcastTransaction(tx);
      setPaymentStatus('success');
      setTimeout(() => {
        setIncomingPaymentRequest(null);
        activeSessionIdRef.current = null;
      }, 3000);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'InsufficientFundsError') {
        setStatusMsg(err.message);
      } else {
        setStatusMsg('Could not complete transaction.');
      }
      setPaymentStatus('error');
    }
  };

  const handleRejectRequest = () => {
    setIncomingPaymentRequest(null);
    activeSessionIdRef.current = null;
  };

  const handleSimulateScan = async () => {
    if (!wallet || !scanUri.startsWith('kickpay://pay')) return;
    try {
      const url = new URL(scanUri);
      const merchantDid = url.searchParams.get('merchant');
      const sessionId = url.searchParams.get('session');
      if (!merchantDid || !sessionId) throw new Error('Invalid URI');

      activeSessionIdRef.current = sessionId;
      setHandshakeStatus('waiting');
      setIsScanning(false);
      setScanUri('');

      await OfflineSyncService.sendHandshake({
        merchantDid,
        customerDid: wallet.did,
        sessionId,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = (text: string, type: 'did' | 'address') => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      if (type === 'did') {
        setCopiedDid(true);
        setTimeout(() => setCopiedDid(false), 2000);
      } else {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      }
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handleRetryBalance = async () => {
    if (wallet && wallet.did) {
      setIsRefreshing(true);
      await fetchBalance(wallet.did, wallet.address);
      setTimeout(() => setIsRefreshing(false), 500); // Visual feedback
    }
  };

  const qvacStatus = aiEngineUsed === 'QVAC' ? 'Ready' : 'Pending';
  const isConnected = !!wallet?.did;

  const truncateDid = (did: string) => did ? `${did.slice(0, 20)}...` : 'No wallet connected';

  return (
    <div className="space-y-6 font-sans pb-10 max-w-7xl mx-auto px-4 relative">
      
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6"
          >
            <h3 className="text-xl font-heading font-bold text-slate-900 text-center mb-4">Scan Payment QR</h3>
            <p className="text-sm text-slate-500 text-center mb-4">Paste the kickpay:// URI to simulate scanning a QR code.</p>
            <input 
              type="text" 
              value={scanUri} 
              onChange={e => setScanUri(e.target.value)}
              placeholder="kickpay://pay?merchant=..." 
              className="w-full border border-slate-300 rounded-lg p-3 mb-6 font-mono text-xs"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsScanning(false)} className="px-4 py-2 rounded-lg text-slate-600 font-medium">Cancel</button>
              <button onClick={handleSimulateScan} disabled={!scanUri} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold">Connect</button>
            </div>
          </motion.div>
        </div>
      )}

      {handshakeStatus === 'waiting' && !incomingPaymentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-8 text-center flex flex-col items-center"
          >
            <RefreshCw size={32} className="animate-spin text-blue-600 mb-4" />
            <h3 className="text-xl font-heading font-bold text-slate-900 mb-2">Connecting to Merchant</h3>
            <p className="text-sm text-slate-500">Waiting for secure payment session...</p>
          </motion.div>
        </div>
      )}

      {incomingPaymentRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6"
          >
            {paymentStatus === 'idle' && (
              <>
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity size={24} />
                </div>
                <h3 className="text-xl font-heading font-bold text-slate-900 text-center mb-2">Payment Request</h3>
                <p className="text-slate-500 text-sm text-center mb-6">A merchant is requesting payment.</p>
                
                <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-6">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                    <span className="text-xs text-slate-500">Amount</span>
                    <span className="text-2xl font-mono font-bold text-slate-900">{incomingPaymentRequest.amount} <span className="text-sm text-slate-400">{incomingPaymentRequest.currency}</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Merchant DID</span>
                    <span className="text-xs font-mono text-slate-900 truncate max-w-[140px]">{incomingPaymentRequest.merchantDid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Expires</span>
                    <span className="text-xs text-slate-900">{new Date(incomingPaymentRequest.expiresAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button onClick={handleRejectRequest} className="flex-1 py-3 px-4 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium transition-colors">
                    Reject
                  </button>
                  {wallet && wallet.usdt !== undefined && wallet.usdt < incomingPaymentRequest.amount ? (
                    <button disabled className="flex-1 py-3 px-4 rounded-xl text-white bg-slate-400 font-bold cursor-not-allowed">
                      Insufficient Balance
                    </button>
                  ) : (
                    <button onClick={handlePayRequest} className="flex-1 py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors">
                      Pay Now
                    </button>
                  )}
                </div>
              </>
            )}
            {paymentStatus === 'signing' && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-1">Signing Transaction</h3>
                <p className="text-sm text-slate-500">Securing payment with your private key...</p>
              </div>
            )}
            {paymentStatus === 'success' && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Payment Sent</h3>
                <p className="text-sm text-slate-500">Transaction broadcasted to local mesh.</p>
              </div>
            )}
            {paymentStatus === 'error' && (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-bold text-red-600 mb-1">Payment Failed</h3>
                <p className="text-sm text-slate-500">{statusMsg}</p>
                <button onClick={handleRejectRequest} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg">Close</button>
              </div>
            )}
          </motion.div>
        </div>
      )}
      
      {/* 1. COMPACT HERO */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950 text-white rounded-[16px] shadow-sm border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            KickPay AI
          </h1>
          <p className="text-slate-400 text-sm">Offline Payment Network</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">{isConnected ? 'Wallet Connected' : 'Wallet Not Found'}</span>
          </div>
        </div>

        {isConnected && (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Balance</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold font-mono">
                  {wallet && wallet.usdt !== undefined ? (
                    <>{wallet.usdt.toFixed(2)}<span className="text-lg text-slate-400 ml-1">USDT</span></>
                  ) : (
                    <span className="text-lg font-sans font-medium text-slate-400">Balance unavailable</span>
                  )}
                </span>
                <button onClick={handleRetryBalance} className="text-slate-500 hover:text-white transition-colors" disabled={isRefreshing}>
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Last Sync: {lastUpdated}</p>
            </div>
            
            <div className="hidden md:block w-px h-12 bg-slate-800"></div>

            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">Offline Identity (DID)</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-slate-200">{truncateDid(wallet.did)}</span>
                <button onClick={() => handleCopy(wallet.did, 'did')} className="text-slate-500 hover:text-white transition-colors">
                  {copiedDid ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider mt-1 flex items-center gap-1">
                <ShieldCheck size={10} /> Offline Ready
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* QUICK ACTIONS */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-4 text-slate-900">
            <Wallet size={18} className="text-slate-400" />
            <h3 className="font-semibold text-sm">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleCopy(wallet?.did || '', 'did')} className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-slate-700">
              <Copy size={16} />
              <span className="text-xs font-medium">Copy DID</span>
            </button>
            <button onClick={handleRetryBalance} disabled={isRefreshing} className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 transition-colors text-slate-700 disabled:opacity-50">
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              <span className="text-xs font-medium">Refresh</span>
            </button>
            <button onClick={() => setIsScanning(true)} className="col-span-2 flex flex-col items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors text-blue-700 mt-1">
              <QrCode size={20} />
              <span className="text-sm font-bold">Scan QR Code</span>
            </button>
          </div>
        </motion.div>

        {/* OFFLINE QUEUE */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-4 text-slate-900">
            <Server size={18} className="text-slate-400" />
            <h3 className="font-semibold text-sm">Offline Queue</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <Server size={32} className="opacity-20 mb-3" />
            <p className="text-sm font-medium text-slate-600">Queue empty</p>
            <p className="text-xs mt-1">Ready for offline payments</p>
          </div>
        </motion.div>

        {/* SETTLEMENT STATUS */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-4 text-slate-900">
            <Database size={18} className="text-slate-400" />
            <h3 className="font-semibold text-sm">Settlement Status</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <Database size={32} className="opacity-20 mb-3" />
            <p className="text-sm font-medium text-slate-600">No settlement required</p>
            <p className="text-xs mt-1">Pending receipts: 0</p>
          </div>
        </motion.div>

        {/* AI STATUS */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-4 text-slate-900">
            <Cpu size={18} className="text-slate-400" />
            <h3 className="font-semibold text-sm">AI Status</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <Cpu size={32} className="opacity-20 mb-3" />
            <p className="text-sm font-medium text-slate-600">No AI decisions yet</p>
            <p className="text-xs mt-1">{qvacStatus === 'Ready' ? 'QVAC Engine: Ready' : 'Engine: Pending'}</p>
          </div>
        </motion.div>

        {/* MERCHANT */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-[12px] border border-slate-200 shadow-sm p-5 flex flex-col justify-between"
        >
          <div className="flex items-center gap-2 mb-4 text-slate-900">
            <Store size={18} className="text-slate-400" />
            <h3 className="font-semibold text-sm">Merchant</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <Store size={32} className="opacity-20 mb-3" />
            <p className="text-sm font-medium text-slate-600">No merchants registered</p>
          </div>
        </motion.div>

        {/* RECEIVE BLOCKCHAIN FUNDS */}
        {wallet?.address && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="md:col-span-1 lg:col-span-1 bg-white rounded-[12px] border border-blue-200 shadow-sm p-5 flex flex-col justify-between"
          >
            <div className="flex items-center gap-2 mb-4 text-blue-900">
              <Wallet size={18} className="text-blue-500" />
              <h3 className="font-semibold text-sm">Receive Funds (Liquid Testnet)</h3>
            </div>
            
            <div className="flex flex-col items-center mb-4">
              {/* Dummy QR code generation representation */}
              <div className="w-32 h-32 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center mb-4">
                <QrCode size={96} className="text-slate-800" />
              </div>
              <p className="text-xs text-slate-500 mb-1">Liquid Testnet Address</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 w-full">
                <span className="text-xs font-mono text-slate-700 truncate flex-1 select-all">{wallet.address}</span>
                <button onClick={() => handleCopy(wallet.address || '', 'address')} className="text-blue-500 hover:text-blue-700 p-1 bg-blue-50 rounded transition-colors flex-shrink-0">
                  {copiedAddress ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            
            <div className="text-center p-3 bg-blue-50 text-blue-800 text-xs rounded-lg font-medium border border-blue-100">
              Fund this address using the Liquid Testnet Faucet to test real blockchain settlement.
            </div>
          </motion.div>
        )}

        {/* RECENT ACTIVITY */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="md:col-span-1 lg:col-span-1 bg-white rounded-[12px] border border-slate-200 shadow-sm flex flex-col h-[300px]"
        >
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Activity size={18} className="text-slate-400" />
            <h3 className="font-semibold text-slate-900 text-sm">Recent Activity</h3>
          </div>
          
          <div className="flex-1 overflow-hidden relative p-3">
            <div className="h-full overflow-y-auto space-y-2 pr-2 scrollbar-none">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <HardDrive size={32} className="opacity-20" />
                  <p className="text-sm font-medium text-slate-600">No offline transactions yet</p>
                </div>
              ) : (
                recentActivity.map((event, idx) => {
                  const txData = event.data || {};
                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                          <Database size={14} />
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900 font-mono capitalize">{event.type || 'Event'}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{txData.id || 'Unknown ID'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-xs text-slate-900">
                          {txData.amount ? `${txData.amount} USDT` : '-'}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                          <CheckCircle2 size={10} className="text-emerald-500" />
                          Replicated
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
