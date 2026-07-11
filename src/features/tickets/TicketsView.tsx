'use client';

import React, { useState } from 'react';
import { PaymentService } from '@/lib/kickpay-core';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, QrCode, Calendar, MapPin, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function TicketsView() {
  const [loading, setLoading] = useState(false);
  const [ticketStatus, setTicketStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [wallet, setWallet] = useState<{ usdt?: number, did: string } | null>(null);

  React.useEffect(() => {
    const data = localStorage.getItem('kickpay_fan_wallet');
    if (data) {
      try {
        const fanWallet = JSON.parse(data);
        import('@/lib/kickpay-core').then(({ WalletService }) => {
          WalletService.getBalance(fanWallet.did).then(bal => {
            setWallet({ ...bal, did: fanWallet.did });
          }).catch(() => {
            setWallet(prev => prev ? { ...prev, usdt: undefined } : null);
          });
        });
      } catch {}
    }
  }, []);

  const handleBuyTicket = async () => {
    setLoading(true);
    setTicketStatus('idle');
    try {
      const data = localStorage.getItem('kickpay_fan_wallet');
      if (!data) throw new Error('No Fan Wallet found. Create one first.');
      const fanWallet = JSON.parse(data);

      const tx = await PaymentService.createTransaction(
        fanWallet.did,
        'did:kickpay:Organizer:tournament',
        100,
        'ticket',
        fanWallet.privateKeyHex
      );

      await PaymentService.submitTransaction(tx);
      
      setTicketStatus('success');
      setStatusMsg(`Ticket secured offline! (Tx: ${tx.id.slice(0, 12)}...)`);
    } catch (err: unknown) {
      setTicketStatus('error');
      if (err instanceof Error && err.name === 'InsufficientFundsError') {
        setStatusMsg(err.message);
      } else if (err instanceof Error) {
        setStatusMsg(err.message);
      } else {
        setStatusMsg('An unknown error occurred');
      }
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (ticketStatus === 'error') {
          setTicketStatus('idle');
          setStatusMsg('');
        }
      }, 5000);
    }
  };

  return (
    <div className="space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary flex items-center gap-2">
            <Ticket className="text-primary-green" />
            Match Tickets
          </h2>
          <p className="text-text-secondary text-sm mt-1">Purchase verifiable offline passes for the KickPay Cup.</p>
        </div>
        <div className="glass px-4 py-2 rounded-full border border-primary-green/20 flex items-center gap-2">
          <Sparkles className="text-primary-green" size={16} />
          <span className="text-xs font-bold text-primary-green tracking-widest uppercase">VIP Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Ticket Card - UEFA/FIFA Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-green/20 to-[#3B82F6]/20 blur-xl group-hover:blur-2xl transition-all duration-500 rounded-[40px]" />
          
          <div className="relative h-full flex flex-col glass rounded-[40px] overflow-hidden border border-white/10 shadow-2xl">
            {/* Top Section */}
            <div className="bg-gradient-to-br from-[#1B7559] to-primary-green p-8 flex justify-between items-start text-white">
              <div>
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">
                  Final Match
                </span>
                <h3 className="text-4xl font-heading font-bold uppercase tracking-tighter leading-none mb-2">
                  KickPay<br/>Cup &apos;26
                </h3>
              </div>
              <div className="text-right">
                <span className="text-5xl font-mono font-bold tracking-tighter">100<span className="text-2xl text-white/70">₮</span></span>
                <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">General Admission</p>
              </div>
            </div>

            {/* Ticket Cutouts */}
            <div className="relative h-8 flex items-center justify-between px-[-10px] bg-bg-dark z-10">
              <div className="w-8 h-8 rounded-full bg-bg-dark -ml-4 shadow-[inset_-3px_0_6px_rgba(0,0,0,0.1)] border-r border-white/5" />
              <div className="flex-1 border-t-2 border-dashed border-white/10 mx-4" />
              <div className="w-8 h-8 rounded-full bg-bg-dark -mr-4 shadow-[inset_3px_0_6px_rgba(0,0,0,0.1)] border-l border-white/5" />
            </div>

            {/* Bottom Section */}
            <div className="bg-card-dark p-8 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-secondary text-xs uppercase tracking-widest mb-1">Date & Time</p>
                    <p className="text-text-primary font-bold flex items-center gap-2">
                      <Calendar size={16} className="text-primary-green" />
                      SEP 14, 2026 • 20:45
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-text-secondary text-xs uppercase tracking-widest mb-1">Venue</p>
                    <p className="text-text-primary font-bold flex items-center gap-2 justify-end">
                      Stadio Cornaredo
                      <MapPin size={16} className="text-primary-green" />
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-1 bg-bg-dark rounded-xl p-3 text-center border border-border-dark">
                    <p className="text-text-secondary text-[10px] uppercase tracking-widest mb-1">Gate</p>
                    <p className="text-text-primary font-mono font-bold text-lg">E4</p>
                  </div>
                  <div className="flex-1 bg-bg-dark rounded-xl p-3 text-center border border-border-dark">
                    <p className="text-text-secondary text-[10px] uppercase tracking-widest mb-1">Row</p>
                    <p className="text-text-primary font-mono font-bold text-lg">12</p>
                  </div>
                  <div className="flex-1 bg-bg-dark rounded-xl p-3 text-center border border-border-dark">
                    <p className="text-text-secondary text-[10px] uppercase tracking-widest mb-1">Seat</p>
                    <p className="text-text-primary font-mono font-bold text-lg">42A</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                {wallet && wallet.usdt !== undefined && wallet.usdt < 100 ? (
                  <button disabled className="w-full bg-slate-400 text-white font-bold py-4 px-6 rounded-2xl cursor-not-allowed">
                    Insufficient Balance
                  </button>
                ) : (
                  <button
                    onClick={handleBuyTicket}
                    disabled={loading || ticketStatus === 'success'}
                    className="w-full bg-white hover:bg-gray-100 text-black font-bold py-4 px-6 rounded-2xl transition-all shadow-lg active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                      />
                    ) : ticketStatus === 'success' ? (
                      <>
                        Ticket Purchased
                        <CheckCircle2 size={18} />
                      </>
                    ) : (
                      <>
                        Buy Offline Pass
                        <QrCode size={18} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Status & owned section */}
        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {ticketStatus === 'success' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-[24px] p-6 border border-primary-green/30 bg-primary-green/5 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary-green/20 flex items-center justify-center text-primary-green shrink-0">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-primary-green mb-1">Purchase Successful</h3>
                  <p className="text-sm text-text-secondary font-mono">{statusMsg}</p>
                </div>
              </motion.div>
            )}
            
            {ticketStatus === 'error' && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass rounded-[24px] p-6 border border-destructive/30 bg-destructive/5 flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center text-destructive shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-destructive mb-1">Purchase Failed</h3>
                  <p className="text-sm text-text-secondary">{statusMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="glass flex-1 rounded-[24px] p-6">
            <h3 className="font-heading font-bold text-lg mb-6">Upcoming Matches</h3>
            
            <div className="space-y-4">
              {[
                { teamA: 'LUG', teamB: 'FCZ', date: 'Sep 14', time: '20:45', price: '100.00' },
                { teamA: 'LUG', teamB: 'SION', date: 'Sep 21', time: '18:00', price: '75.00' },
                { teamA: 'YB', teamB: 'LUG', date: 'Oct 05', time: '20:30', price: '120.00', away: true },
              ].map((match, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/5 border border-border-dark hover:border-text-secondary/30 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase text-text-secondary mb-1">{match.date}</p>
                      <p className="font-mono text-sm text-text-primary">{match.time}</p>
                    </div>
                    <div className="w-px h-8 bg-border-dark" />
                    <div className="flex items-center gap-3 font-heading font-bold text-lg">
                      <span>{match.teamA}</span>
                      <span className="text-xs text-text-secondary font-sans font-normal px-2">vs</span>
                      <span>{match.teamB}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-primary-green group-hover:text-white transition-colors">{match.price} ₮</span>
                    {match.away && <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">Away</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
