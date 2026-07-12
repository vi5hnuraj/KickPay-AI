import type { Transaction, Receipt, Settlement, POSSession, Merchant, Ticket, Donation, PrizeDistribution, Wallet, PaymentRequest, PaymentSessionHandshake } from '@/lib/shared-types';

export type KickPaySyncPayload = 
  | { type: 'transaction'; data: Transaction }
  | { type: 'receipt'; data: Receipt }
  | { type: 'settlement'; data: Settlement }
  | { type: 'pos_session'; data: POSSession }
  | { type: 'merchant'; data: Merchant }
  | { type: 'ticket'; data: Ticket }
  | { type: 'donation'; data: Donation }
  | { type: 'prize_distribution'; data: PrizeDistribution }
  | { type: 'wallet'; data: Wallet }
  | { type: 'payment_request'; data: PaymentRequest }
  | { type: 'payment_handshake'; data: PaymentSessionHandshake };

export interface LogEntry<T = KickPaySyncPayload> {
  seq: number;
  author: string;
  signature: string;
  timestamp: number;
  payload: T;
}

export type SyncCallback<T = KickPaySyncPayload> = (entry: LogEntry<T>) => void;

let HypercoreClass: any = null;
let AutobaseClass: any = null;
let CorestoreClass: any = null;

async function initRealPearsStack(): Promise<boolean> {
  if (typeof window !== 'undefined' && !(window as any).Pear) {
    // Avoid loading hypercore/autobase on standard browsers to prevent bundle issues
    return false;
  }
  if (HypercoreClass) return true;
  try {
    const hcMod = await import(/* webpackIgnore: true */ 'hypercore');
    const abMod = await import(/* webpackIgnore: true */ 'autobase');
    // @ts-ignore
    const csMod = await import(/* webpackIgnore: true */ 'corestore');
    HypercoreClass = hcMod.default || hcMod;
    AutobaseClass = abMod.default || abMod;
    CorestoreClass = csMod.default || csMod;
    return true;
  } catch (err) {
    console.warn('[SyncAdapter] Real Hypercore/Autobase modules not available in this environment. Falling back to memory arrays.');
    return false;
  }
}

export class HypercoreManager<T = KickPaySyncPayload> {
  public key: string;
  private storage: LogEntry<T>[] = [];
  private listeners: Set<SyncCallback<T>> = new Set();
  private realCore: any = null;
  public isPear = false;

  constructor(key: string) {
    this.key = key;
    this.isPear = (globalThis as any).Pear !== undefined;
    if (this.isPear) {
      this.initRealCore();
    }
  }

  private async initRealCore() {
    const success = await initRealPearsStack();
    if (success && HypercoreClass) {
      try {
        const storageDir = `./.pear-storage/${this.key}`;
        this.realCore = new HypercoreClass(storageDir, { valueEncoding: 'json' });
        await this.realCore.ready();
        console.log(`[SyncAdapter] Real Hypercore ready for topic: ${this.key}`);

        this.realCore.on('append', async () => {
          const len = this.realCore.length;
          const entry = await this.realCore.get(len - 1);
          if (entry) {
            this.listeners.forEach(fn => fn(entry));
          }
        });
      } catch (err) {
        console.error('[SyncAdapter] Real Hypercore init failed. Using memory core.', err);
        this.realCore = null;
      }
    }
  }

  async append(author: string, payload: T, signature: string): Promise<number> {
    const entry: LogEntry<T> = {
      seq: this.realCore ? this.realCore.length : this.storage.length,
      author,
      signature,
      timestamp: Date.now(),
      payload
    };

    if (this.realCore) {
      await this.realCore.ready();
      await this.realCore.append(entry);
      return entry.seq;
    }

    this.storage.push(entry);
    this.listeners.forEach(fn => fn(entry));
    return entry.seq;
  }

  async get(seq: number): Promise<LogEntry<T> | null> {
    if (this.realCore) {
      try {
        await this.realCore.ready();
        const entry = await this.realCore.get(seq);
        return entry || null;
      } catch {
        return null;
      }
    }
    return this.storage[seq] || null;
  }

  async length(): Promise<number> {
    if (this.realCore) {
      await this.realCore.ready();
      return this.realCore.length;
    }
    return this.storage.length;
  }

  subscribe(callback: SyncCallback<T>): () => void {
    this.listeners.add(callback);

    if (this.realCore) {
      this.realCore.ready().then(async () => {
        const len = this.realCore.length;
        for (let i = 0; i < len; i++) {
          const entry = await this.realCore.get(i);
          if (entry) callback(entry);
        }
      });
    } else {
      this.storage.forEach(entry => callback(entry));
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  replicate(other: HypercoreManager<T>) {
    if (this.realCore && other.realCore) {
      try {
        const stream1 = this.realCore.replicate(true, { keepAlive: false });
        const stream2 = other.realCore.replicate(false, { keepAlive: false });
        stream1.pipe(stream2).pipe(stream1);
        return;
      } catch (e) {
        console.error('[SyncAdapter] Real replication failed, falling back.', e);
      }
    }

    this.storage.forEach(entry => {
      if (entry.seq >= other.storage.length) {
        other.storage.push(entry);
        other.listeners.forEach(fn => fn(entry));
      }
    });
    other.storage.forEach(entry => {
      if (entry.seq >= this.storage.length) {
        this.storage.push(entry);
        this.listeners.forEach(fn => fn(entry));
      }
    });
  }
}

export class AutobaseManager {
  private cores: Map<string, HypercoreManager> = new Map();
  private unifiedLog: LogEntry[] = [];
  private listeners: Set<(log: LogEntry[]) => void> = new Set();
  
  public realAutobase: any = null;
  public realStore: any = null;
  public viewCore: any = null;
  private isPear = false;

  constructor() {
    this.isPear = (globalThis as any).Pear !== undefined;
    if (this.isPear) {
      this.initRealAutobase();
    }
  }

  private async initRealAutobase() {
    const success = await initRealPearsStack();
    if (success && AutobaseClass && CorestoreClass) {
      try {
        const storageDir = process.env.PEAR_STORAGE_DIR || `./.pear-storage/autobase-store`;
        this.realStore = new CorestoreClass(storageDir);
        await this.realStore.ready();
        
        // Setup real autobase with a linearizer
        const self = this;
        this.realAutobase = new AutobaseClass(this.realStore, null, {
          async apply(nodes: any[], view: any, host: any) {
            for (const node of nodes) {
              await view.append(node.value);
            }
          },
          open(store: any) {
            return store.get({ name: 'view', valueEncoding: 'json' });
          }
        });
        
        await this.realAutobase.ready();
        this.viewCore = this.realAutobase.view;
        
        this.viewCore.on('append', async () => {
          const len = this.viewCore.length;
          const newEntries: LogEntry[] = [];
          for (let i = 0; i < len; i++) {
            const entry = await this.viewCore.get(i);
            if (entry) newEntries.push(entry);
          }
          this.unifiedLog = newEntries;
          this.listeners.forEach(fn => fn(this.unifiedLog));
        });
        
        console.log(`[SyncAdapter] Real Autobase ready with discovery key: ${this.realAutobase.discoveryKey.toString('hex')}`);
      } catch (err) {
        console.error('[SyncAdapter] Real Autobase init failed. Using memory linearizer.', err);
        this.realAutobase = null;
      }
    }
  }

  async registerCore(core: HypercoreManager) {
    this.cores.set(core.key, core);
    
    if (this.realAutobase && core.isPear) {
      // In Pear, we append to Autobase natively using Autobase's local writer
      // Wait for core to be ready to pipe it? Actually, Autobase manages its own writers.
      // So we just add the core as a writer if it's external, or append if local.
      return; 
    }

    core.subscribe((entry) => {
      if (!this.unifiedLog.some(e => e.signature === entry.signature && e.timestamp === entry.timestamp)) {
        this.unifiedLog.push(entry);
        this.unifiedLog.sort((a, b) => a.timestamp - b.timestamp);
        this.listeners.forEach(fn => fn(this.unifiedLog));
      }
    });
  }
  
  async append(author: string, payload: any, signature: string) {
    const entry: LogEntry = {
      seq: this.realAutobase ? this.viewCore.length : this.unifiedLog.length,
      author,
      signature,
      timestamp: Date.now(),
      payload
    };
    
    if (this.realAutobase) {
      await this.realAutobase.append(entry);
    } else {
      const core = this.cores.get(author) || this.cores.values().next().value;
      if (core) {
        await core.append(author, payload, signature);
      } else {
        this.unifiedLog.push(entry);
        this.unifiedLog.sort((a, b) => a.timestamp - b.timestamp);
        this.listeners.forEach(fn => fn(this.unifiedLog));
      }
    }
  }

  subscribeUnified(callback: (log: LogEntry[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.unifiedLog);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export * from './p2p-client';
