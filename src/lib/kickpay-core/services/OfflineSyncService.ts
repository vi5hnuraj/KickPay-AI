import { Transaction, Receipt, Settlement, Merchant, Ticket, Donation, PrizeDistribution, PaymentRequest, PaymentSessionHandshake } from '@/lib/shared-types';
import { HypercoreManager, AutobaseManager, P2PClient, SyncCallback, KickPaySyncPayload } from '@/lib/sync-adapter';

/**
 * OfflineSyncService coordinates the P2P synchronization of KickPay models.
 * It abstracts Hypercore and Hyperswarm from the UI.
 * 
 * Responsibilities:
 * - Append to Hypercore
 * - Broadcast via Hyperswarm
 * - Queue offline transactions
 * - Retry synchronization when reconnecting
 */
export class OfflineSyncService {
  private static core: HypercoreManager | null = null;
  private static autobase: AutobaseManager | null = null;
  private static p2pClient: P2PClient | null = null;
  private static offlineQueue: Transaction[] = [];
  private static pendingCallbacks: ((data: KickPaySyncPayload) => void)[] = [];

  static initialize(did: string, topic: string, onSync?: SyncCallback): void {
    this.core = new HypercoreManager(did);
    this.autobase = new AutobaseManager();
    this.autobase.registerCore(this.core);

    // Process any queued callbacks registered before initialization completed
    this.pendingCallbacks.forEach(callback => {
      this.autobase!.subscribeUnified((log: any[]) => {
        const latest = log[log.length - 1];
        if (latest && latest.payload) callback(latest.payload);
      });
    });
    this.pendingCallbacks = [];
    
    if (onSync) {
      this.autobase.subscribeUnified((log: any[]) => {
        const latest = log[log.length - 1];
        if (latest) onSync(latest);
      });
    }
    
    this.p2pClient = new P2PClient('ws://localhost:3002', did, topic, this.core, this.autobase);
    this.p2pClient.connect((connected) => {
      if (connected) {
        this.retrySynchronization();
      }
    });
  }

  static async broadcastTransaction(tx: Transaction): Promise<void> {
    if (!this.core) {
      this.queueOfflineTransaction(tx);
      return;
    }

    try {
      const payload: KickPaySyncPayload = { type: 'transaction', data: tx };
      if (this.autobase) {
        await this.autobase.append(tx.senderWallet, payload, tx.signature);
      } else {
        await this.core.append(tx.senderWallet, payload, tx.signature);
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to append to core, queueing offline.', err);
      this.queueOfflineTransaction(tx);
    }
  }

  static queueOfflineTransaction(tx: Transaction): void {
    console.log(`[OfflineSyncService] Queued offline transaction ${tx.id}`);
    this.offlineQueue.push(tx);
  }

  static async retrySynchronization(): Promise<void> {
    if (!this.core || this.offlineQueue.length === 0) return;
    
    console.log(`[OfflineSyncService] Network reconnected. Synchronizing ${this.offlineQueue.length} queued transactions.`);
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const tx of queue) {
      await this.broadcastTransaction(tx);
    }
  }

  static async broadcastReceipt(receipt: Receipt): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'receipt', data: receipt };
      if (this.autobase) {
        await this.autobase.append(receipt.merchantId, payload, receipt.merchantSignature);
      } else {
        await this.core.append(receipt.merchantId, payload, receipt.merchantSignature);
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast receipt.', err);
    }
  }

  static async broadcastSettlement(settlement: Settlement): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'settlement', data: settlement };
      if (this.autobase) {
        await this.autobase.append(settlement.merchantId, payload, 'system_sig');
      } else {
        await this.core.append(settlement.merchantId, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast settlement.', err);
    }
  }

  static async broadcastMerchant(merchant: Merchant): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'merchant', data: merchant };
      if (this.autobase) {
        await this.autobase.append(merchant.did, payload, 'system_sig');
      } else {
        await this.core.append(merchant.did, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast merchant.', err);
    }
  }

  static async broadcastTicket(ticket: Ticket): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'ticket', data: ticket };
      if (this.autobase) {
        await this.autobase.append(ticket.ownerDid, payload, 'system_sig');
      } else {
        await this.core.append(ticket.ownerDid, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast ticket.', err);
    }
  }

  static async broadcastDonation(donation: Donation): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'donation', data: donation };
      if (this.autobase) {
        await this.autobase.append(donation.donorDid, payload, 'system_sig');
      } else {
        await this.core.append(donation.donorDid, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast donation.', err);
    }
  }

  static async broadcastPrizeDistribution(distribution: PrizeDistribution): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'prize_distribution', data: distribution };
      if (this.autobase) {
        await this.autobase.append(distribution.recipientWallet, payload, 'system_sig');
      } else {
        await this.core.append(distribution.recipientWallet, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast prize distribution.', err);
    }
  }

  /**
   * Logical API to send a targeted payment request.
   * NOTE: Under the hood, this uses the Autobase/Hypercore append-only replicated log.
   * It is not a direct peer-to-peer socket. All peers physically replicate the payload,
   * but only the intended recipient processes it through application-layer filtering.
   */
  static async sendPaymentRequest(request: PaymentRequest): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'payment_request', data: request };
      if (this.autobase) {
        await this.autobase.append(request.merchantDid, payload, 'system_sig');
      } else {
        await this.core.append(request.merchantDid, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast payment request.', err);
    }
  }

  /**
   * Logical API to send a handshake response to a merchant.
   * NOTE: Under the hood, this uses the Autobase/Hypercore append-only replicated log.
   * All peers physically replicate the payload, but only the targeted merchant processes it.
   */
  static async sendHandshake(handshake: PaymentSessionHandshake): Promise<void> {
    if (!this.core) return;
    try {
      const payload: KickPaySyncPayload = { type: 'payment_handshake', data: handshake };
      if (this.autobase) {
        await this.autobase.append(handshake.customerDid, payload, 'system_sig');
      } else {
        await this.core.append(handshake.customerDid, payload, 'system_sig');
      }
    } catch (err) {
      console.warn('[OfflineSyncService] Failed to broadcast handshake.', err);
    }
  }

  static receiveReplicatedTransactions(callback: (data: KickPaySyncPayload) => void): void {
    if (this.autobase) {
      this.autobase.subscribeUnified((log: any[]) => {
        const latest = log[log.length - 1];
        if (latest && latest.payload) callback(latest.payload);
      });
    } else if (this.core) {
      this.core.subscribe((entry) => {
        if (entry && entry.payload) callback(entry.payload);
      });
    } else {
      this.pendingCallbacks.push(callback);
    }
  }
}
