'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PaymentService } from '@/lib/kickpay-core';
import { parsePaymentCommand } from './qvac-service';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  User, 
  Send, 
  Cpu, 
  AlertTriangle,
  Sparkles,
  PieChart,
  ShieldAlert,
  TerminalSquare
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
}

export default function AIAssistantView() {
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing'>('idle');
  const [engineUsed, setEngineUsed] = useState<string>('Standby');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: (
        <div className="space-y-2">
          <p>Hello! I am QVAC, your AI financial assistant.</p>
          <p className="text-sm text-text-secondary">You can ask me to perform actions like:</p>
          <ul className="list-disc list-inside text-sm text-text-secondary ml-2 space-y-1">
            <li>&quot;Pay 15 USDT to the Lugano Merch Stand&quot;</li>
            <li>&quot;Buy a VIP ticket to the Final Match&quot;</li>
            <li>&quot;Donate 50 USDT to the Youth Academy&quot;</li>
            <li>&quot;Show my spending summary&quot;</li>
          </ul>
        </div>
      )
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string | React.ReactNode) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role, content }]);
  };

  const handleSimulateVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const userCommand = command;
    setCommand('');
    addMessage('user', userCommand);
    setStatus('processing');

    try {
      // 1. QVAC parses intent
      const { intent: parsedIntent, engine } = await parsePaymentCommand(userCommand);
      setEngineUsed(engine);

      // Handle Engine Unavailable gracefully
      if (engine === 'None') {
        addMessage('assistant', (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={18} />
              <span className="font-bold">QVAC Runtime Unavailable</span>
            </div>
            <p className="text-sm">The local AI runtime is not detected in your current environment. Intents cannot be securely parsed on this device.</p>
          </div>
        ));
        setStatus('idle');
        return;
      }

      if (parsedIntent.action === 'unknown') {
        addMessage('assistant', "I didn't quite catch that. Could you try rephrasing your request?");
        setStatus('idle');
        return;
      }

      if (parsedIntent.action === 'show_spending') {
        addMessage('assistant', (
          <div className="space-y-4 w-full">
            <div className="flex items-center gap-2 text-white">
              <PieChart size={18} className="text-[#3B82F6]" />
              <span className="font-bold">Spending Summary</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              <div className="p-4 rounded-xl bg-secondary/10 border border-border-dark">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">Total Spent</p>
                <p className="text-lg font-mono font-bold text-white">150.00 ₮</p>
              </div>
              <div className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                <p className="text-[10px] uppercase tracking-widest text-[#F59E0B] mb-1">Food</p>
                <p className="text-lg font-mono font-bold text-white">15.00 ₮</p>
              </div>
              <div className="p-4 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
                <p className="text-[10px] uppercase tracking-widest text-[#8B5CF6] mb-1">Tickets</p>
                <p className="text-lg font-mono font-bold text-white">135.00 ₮</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                <p className="text-[10px] uppercase tracking-widest text-accent mb-1">Donations</p>
                <p className="text-lg font-mono font-bold text-white">0.00 ₮</p>
              </div>
            </div>
          </div>
        ));
        setStatus('idle');
        return;
      }

      // 2. Map Intent to Business Logic
      const data = localStorage.getItem('kickpay_fan_wallet');
      if (!data) {
        addMessage('assistant', "I cannot process transactions because your Fan Wallet is not set up. Please create one in the Wallet tab.");
        setStatus('idle');
        return;
      }
      const fanWallet = JSON.parse(data);

      const tx = await PaymentService.createTransaction(
        fanWallet.did,
        `did:kickpay:merchant:${parsedIntent.merchant?.replace(/\s+/g, '_').toLowerCase()}`,
        parsedIntent.amount || 0,
        parsedIntent.action === 'buy_ticket' ? 'ticket' : parsedIntent.action === 'donate' ? 'donation' : 'food',
        fanWallet.privateKeyHex
      );

      const { insight } = await PaymentService.submitTransaction(tx);
      
      addMessage('assistant', (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary-green">
            <Sparkles size={18} />
            <span className="font-bold">Transaction Securely Processed</span>
          </div>
          
          <div className="glass-dark rounded-xl p-4 space-y-2 border border-primary-green/20">
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Amount</span>
              <span className="font-mono font-bold text-white">{parsedIntent.amount?.toFixed(2)} ₮</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Merchant</span>
              <span className="font-medium text-white capitalize">{parsedIntent.merchant}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
              <span className="text-text-secondary">Tx ID</span>
              <span className="font-mono text-xs text-text-secondary">{tx.id.slice(0, 16)}...</span>
            </div>
          </div>

          {insight && (
            <div className="rounded-xl p-4 bg-pitch-red/10 border border-pitch-red/20 space-y-2 mt-4">
              <div className="flex items-center gap-2 text-pitch-red">
                <ShieldAlert size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Fraud Insight Detected</span>
              </div>
              <p className="text-sm text-text-primary">{insight.description}</p>
              <div className="w-full bg-black/40 rounded-full h-1.5 mt-2">
                <div 
                  className="bg-pitch-red h-1.5 rounded-full" 
                  style={{ width: `${insight.confidenceScore * 100}%` }}
                />
              </div>
              <p className="text-right text-[10px] text-pitch-red/70 font-mono">Confidence: {(insight.confidenceScore * 100).toFixed(0)}%</p>
            </div>
          )}
        </div>
      ));

    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error && err.name === 'InsufficientFundsError') {
        addMessage('assistant', (
          <div className="text-destructive">
            {err.message}
          </div>
        ));
      } else {
        addMessage('assistant', (
          <div className="text-destructive">
            An error occurred while processing your request. Please try again.
          </div>
        ));
      }
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[800px] glass rounded-[32px] overflow-hidden border border-border-dark shadow-2xl relative">
      
      {/* Header */}
      <div className="h-16 border-b border-border-dark flex items-center justify-between px-6 bg-bg-dark/50 backdrop-blur shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center text-white">
            <Bot size={16} />
          </div>
          <div>
            <h2 className="font-heading font-bold text-white text-sm">QVAC Assistant</h2>
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold flex items-center gap-1 mt-0.5">
              <Cpu size={10} className={engineUsed === 'QVAC' ? 'text-primary-green' : 'text-text-secondary'} />
              Engine: {engineUsed}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-text-secondary bg-secondary/10 px-3 py-1.5 rounded-full">
          <TerminalSquare size={14} />
          Local Inference
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-border-dark bg-gradient-to-b from-transparent to-bg-dark/30">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div 
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                msg.role === 'user' 
                  ? 'bg-secondary text-white' 
                  : 'bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] text-white'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`max-w-[80%] rounded-[20px] p-4 ${
                msg.role === 'user'
                  ? 'bg-secondary text-white rounded-tr-sm'
                  : 'glass-dark border border-white/5 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          
          {status === 'processing' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center shrink-0 text-white">
                <Bot size={16} />
              </div>
              <div className="glass-dark border border-white/5 rounded-[20px] rounded-tl-sm px-5 py-4 flex items-center gap-2">
                <motion.div 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} 
                  className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full" 
                />
                <motion.div 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} 
                  className="w-1.5 h-1.5 bg-[#8B5CF6] rounded-full" 
                />
                <motion.div 
                  animate={{ y: [0, -5, 0] }} 
                  transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} 
                  className="w-1.5 h-1.5 bg-primary-green rounded-full" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-bg-dark/80 backdrop-blur border-t border-border-dark shrink-0">
        <form onSubmit={handleSimulateVoice} className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type a command (e.g. 'Pay 15 USDT to Hotdog Stand')..."
            className="w-full bg-card-dark border border-border-dark rounded-2xl pl-5 pr-14 py-4 text-sm text-text-primary focus:border-primary-green focus:ring-1 focus:ring-primary-green outline-none transition-all shadow-inner"
            disabled={status === 'processing'}
          />
          <button 
            type="submit" 
            disabled={!command.trim() || status === 'processing'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-primary-green hover:bg-[#1B7559] disabled:bg-secondary disabled:text-text-secondary text-black rounded-xl flex items-center justify-center transition-colors"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
        <p className="text-center text-[10px] text-text-secondary mt-3">
          Local inference by QVAC. Data never leaves your device.
        </p>
      </div>
    </div>
  );
}
