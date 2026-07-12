/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { OfflineSyncService } from '@/lib/kickpay-core';
import { Transaction } from '@/lib/shared-types';
import { 
  ArrowUpRight, 
  Search, 
  Filter, 
  Download, 
  Coffee, 
  Shirt, 
  Ticket, 
  HeartHandshake,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentsView() {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');

  const TX_STORAGE_KEY = 'kickpay_tx_history';
  const MAX_STORED = 200;

  useEffect(() => {
    // Load persisted history on mount so transactions survive page refreshes
    try {
      const stored = localStorage.getItem(TX_STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Corrupt storage — start fresh
      localStorage.removeItem(TX_STORAGE_KEY);
    }

    // Subscribe to new transactions arriving via the mesh/WebSocket
    OfflineSyncService.receiveReplicatedTransactions((data: any) => {
      if (data.type === 'transaction') {
        const incoming = data.data as Transaction;
        setHistory(prev => {
          // Deduplicate by transaction id
          if (prev.some(tx => tx.id === incoming.id)) return prev;
          const updated = [incoming, ...prev].slice(0, MAX_STORED);
          try {
            localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(updated));
          } catch { /* storage full — skip persistence */ }
          return updated;
        });
      }
    });
  }, []);


  const filteredTx = history.filter(tx => 
    tx.id.toLowerCase().includes(search.toLowerCase()) || 
    tx.category.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'food': return <Coffee size={18} className="text-[#F59E0B]" />;
      case 'retail': return <Shirt size={18} className="text-[#3B82F6]" />;
      case 'ticket': return <Ticket size={18} className="text-[#8B5CF6]" />;
      case 'donation': return <HeartHandshake size={18} className="text-accent" />;
      default: return <ArrowUpRight size={18} className="text-text-secondary" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category.toLowerCase()) {
      case 'food': return 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]';
      case 'retail': return 'bg-[#3B82F6]/10 border-[#3B82F6]/20 text-[#3B82F6]';
      case 'ticket': return 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20 text-[#8B5CF6]';
      case 'donation': return 'bg-accent/10 border-accent/20 text-accent';
      default: return 'bg-secondary/10 border-secondary/20 text-text-secondary';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Ledger History</h2>
          <p className="text-text-secondary text-sm mt-1">Real-time synced offline transactions.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Search transactions..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-dark border border-border-dark rounded-xl pl-9 pr-4 py-2 text-sm focus:border-primary-green outline-none transition-colors"
            />
          </div>
          <button className="p-2 border border-border-dark rounded-xl hover:bg-secondary/5 transition-colors text-text-secondary">
            <Filter size={18} />
          </button>
          <button className="p-2 border border-border-dark rounded-xl hover:bg-secondary/5 transition-colors text-text-secondary">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Advanced Table */}
      <div className="glass rounded-[24px] overflow-hidden border border-border-dark/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-dark text-xs uppercase tracking-widest text-text-secondary bg-secondary/5">
                <th className="p-4 font-semibold">Transaction</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold hidden md:table-cell">Status</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Date</th>
                <th className="p-4 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={tx.id} 
                    className="border-b border-border-dark/50 hover:bg-secondary/5 transition-colors group cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-bg-dark border border-border-dark flex items-center justify-center shrink-0">
                          {getCategoryIcon(tx.category)}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-sm text-text-primary group-hover:text-primary-green transition-colors">
                            {tx.id.slice(0, 16)}...
                          </p>
                          <p className="text-xs text-text-secondary font-mono lg:hidden mt-0.5">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <span className="font-mono font-bold text-text-primary text-sm">
                        {tx.amount.toFixed(2)} ₮
                      </span>
                    </td>
                    
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${getCategoryColor(tx.category)}`}>
                        {tx.category}
                      </span>
                    </td>
                    
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {tx.status === 'completed' ? (
                          <CheckCircle2 size={14} className="text-primary-green" />
                        ) : (
                          <Clock size={14} className="text-accent" />
                        )}
                        <span className="text-xs font-medium text-text-secondary capitalize">{tx.status}</span>
                      </div>
                    </td>
                    
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-sm text-text-secondary">
                        {new Date(tx.timestamp).toLocaleString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </td>
                    
                    <td className="p-4 text-right">
                      <button className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
