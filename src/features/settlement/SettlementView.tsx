/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { SettlementService, WalletService, OfflineSyncService } from '@/lib/kickpay-core';
import { Receipt } from '@/lib/shared-types';
import { motion } from 'framer-motion';
import { 
  Building2, 
  ArrowRight, 
  Database,
  ArrowDownToLine,
  Wallet,
  Server,
  ShieldCheck
} from 'lucide-react';

export default function SettlementView() {
  const [organizerWallet, setOrganizerWallet] = useState<{ did: string; privateKeyHex: string } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [settlements, setSettlements] = useState<Receipt[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : false);

  useEffect(() => {
    let isMounted = true;
    const data = localStorage.getItem('kickpay_merchant_wallet');
    if (data && isMounted) {
      setTimeout(() => {
        setOrganizerWallet(JSON.parse(data));
      }, 50);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => { 
      isMounted = false; 
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    OfflineSyncService.receiveReplicatedTransactions((data: any) => {
      if (data.type === 'receipt') {
        const rcpt = data.data as Receipt;
        setSettlements(prev => {
          const index = prev.findIndex(p => p.receiptId === rcpt.receiptId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = rcpt;
            return next;
          }
          return [rcpt, ...prev];
        });
      }
    });
  }, []);

  const handleCreateOrganizer = async () => {
    setLoading(true);
    try {
      const nw = await WalletService.createWallet('merchant');
      const balances = await WalletService.getBalance(nw.did);
      const wallet = { ...nw, ...balances };
      localStorage.setItem('kickpay_merchant_wallet', JSON.stringify(wallet));
      setOrganizerWallet(wallet);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-bold">Pending Settlement</span>;
      case 'submitting': return <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded text-xs font-bold animate-pulse">Submitting</span>;
      case 'waiting_confirmation': return <span className="px-2 py-1 bg-purple-500/20 text-purple-500 rounded text-xs font-bold animate-pulse">Waiting Confirmation</span>;
      case 'confirmed': return <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-bold">Confirmed</span>;
      case 'failed': return <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-bold">Failed</span>;
      case 'retrying': return <span className="px-2 py-1 bg-orange-500/20 text-orange-500 rounded text-xs font-bold">Retrying</span>;
      default: return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-bold">Unsettled</span>;
    }
  };

  if (!organizerWallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-8 relative z-10">
        <div className="w-20 h-20 rounded-2xl bg-[#F5B014]/10 border border-[#F5B014]/20 flex items-center justify-center text-[#F5B014] shadow-[0_0_30px_rgba(245,176,20,0.2)]">
          <Building2 size={40} />
        </div>
        <div>
          <h2 className="text-3xl font-heading font-bold text-white mb-3">Merchant Hub</h2>
          <p className="text-text-secondary">Initialize your wallet to process offline settlements.</p>
        </div>
        
        <button
          onClick={handleCreateOrganizer}
          disabled={loading}
          className="w-full bg-[#F5B014] hover:bg-[#D49811] text-black font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-[#F5B014]/20 hover:shadow-[#F5B014]/40 active:scale-95 flex justify-center items-center gap-2"
        >
          {loading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
            />
          ) : (
            <>
              Initialize
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary flex items-center gap-2">
            <Building2 className="text-pitch-gold" />
            Settlement Hub
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Status: {isOnline ? <span className="text-green-500 font-bold">Online - Daemon Active</span> : <span className="text-red-500 font-bold">Offline - Waiting for connection</span>}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 glass px-4 py-2 rounded-full border border-pitch-gold/20 text-xs">
          <Server size={14} className="text-pitch-gold" />
          <span className="font-bold text-text-primary">Network Metadata Unavailable (WDK constraint)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass rounded-[24px] p-6 border-t-[6px] border-t-pitch-gold relative overflow-hidden">
            <h3 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
              <ShieldCheck className="text-pitch-gold" />
              Merchant Identity
            </h3>
            
            <div className="bg-bg-dark rounded-xl p-4 border border-border-dark flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pitch-gold/10 text-pitch-gold flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold mb-1">DID</p>
                <p className="text-sm font-mono text-white truncate max-w-[200px]">{organizerWallet.did}</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-[24px] p-6 flex-1 flex flex-col">
            <h3 className="font-heading font-bold text-lg mb-2">Automated Settlement</h3>
            <p className="text-sm text-text-secondary mb-6">Settlement happens automatically in the background when an internet connection is detected.</p>
            
            <div className="mt-auto space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <h4 className="text-blue-400 font-bold text-sm mb-1">Queue Status</h4>
                <p className="text-text-secondary text-xs">
                  {SettlementService.getPendingSettlements().length} receipts awaiting settlement.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 glass rounded-[24px] p-6 flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-dark">
            <h3 className="font-heading font-bold text-lg flex items-center gap-2">
              <ArrowDownToLine className="text-text-secondary" />
              Settlement History
            </h3>
            <span className="text-xs font-medium text-text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
              {settlements.length} Receipts
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {settlements.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary/50 space-y-4">
                <Database size={48} strokeWidth={1} />
                <p>No settlements broadcasted to the network yet.</p>
              </div>
            ) : (
              settlements.map((s, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={s.receiptId} 
                  className="bg-bg-dark rounded-xl p-4 border border-border-dark hover:border-pitch-gold/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                        <ArrowDownToLine size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-mono text-text-secondary">Receipt: {s.receiptId.slice(0, 16)}...</p>
                        <p className="text-xs text-text-secondary mt-0.5">Session: {s.sessionId || 'N/A'}</p>
                      </div>
                    </div>
                    {getStatusBadge(s.settlementStatus)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold mb-1">Amount</p>
                      <p className="text-sm font-bold text-white">{s.amount} {s.currency === 'LiquidBitcoin' ? 'L-BTC' : 'USDT'}</p>
                    </div>
                    <div className="bg-black/20 rounded-lg p-3">
                      <p className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold mb-1">Blockchain</p>
                      <p className="text-sm font-bold text-white capitalize">{s.chain || 'Pending'}</p>
                    </div>
                  </div>

                  {s.txHash && (
                    <div className="mt-4 pt-3 border-t border-border-dark flex justify-between items-center">
                      <p className="text-xs font-mono text-text-secondary truncate pr-4">Tx: {s.txHash}</p>
                      {/* Explorer link disabled as per strict rules: WDK does not provide native network resolution */}
                    </div>
                  )}
                  {s.settlementStatus === 'failed' && (
                    <div className="mt-4 pt-3 border-t border-border-dark flex justify-between items-center">
                      <p className="text-xs font-mono text-red-500 pr-4 break-all">{s.chain}</p>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
