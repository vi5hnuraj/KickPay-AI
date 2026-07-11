import { Transaction, Receipt, Settlement } from '@/lib/shared-types';
import { OfflineSyncService } from './OfflineSyncService';
import { WalletService } from './WalletService';

export class SettlementService {
  private static pendingReceipts: Map<string, Receipt> = new Map();
  private static pendingTransactions: Map<string, Transaction> = new Map();
  private static isProcessing: boolean = false;
  private static isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : false;

  static {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SettlementService] Network restored. Starting settlement daemon...');
        this.isOnline = true;
        this.startDaemon();
      });
      window.addEventListener('offline', () => {
        console.log('[SettlementService] Network lost. Halting settlement daemon.');
        this.isOnline = false;
      });
    }
  }

  static queueForSettlement(tx: Transaction, receipt: Receipt): void {
    receipt.settlementStatus = 'pending';
    receipt.retryCount = 0;
    this.pendingTransactions.set(tx.id, tx);
    this.pendingReceipts.set(receipt.receiptId, receipt);
    
    OfflineSyncService.broadcastReceipt(receipt);
    this.startDaemon();
  }

  static getPendingSettlements(): Receipt[] {
    return Array.from(this.pendingReceipts.values());
  }

  private static async startDaemon() {
    if (this.isProcessing || !this.isOnline) return;
    this.isProcessing = true;
    try {
      await this.processQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processQueue() {
    const queue = Array.from(this.pendingReceipts.values())
      .filter(r => r.settlementStatus === 'pending' || r.settlementStatus === 'retrying');

    for (const receipt of queue) {
      if (!this.isOnline) break;
      const tx = this.pendingTransactions.get(receipt.transactionId);
      if (!tx) continue;

      await this.submitOneSettlement(receipt, tx);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  private static async submitOneSettlement(receipt: Receipt, tx: Transaction) {
    receipt.settlementStatus = 'submitting';
    await OfflineSyncService.broadcastReceipt(receipt);

    try {
      const merchantWalletRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('kickpay_merchant_wallet') : null;
      if (!merchantWalletRaw) throw new Error("Merchant wallet not found.");
      
      const merchantWallet = JSON.parse(merchantWalletRaw);
      const merchantPrivateKeyHex = merchantWallet.privateKeyHex;
      
      receipt.settlementStatus = 'waiting_confirmation';
      await OfflineSyncService.broadcastReceipt(receipt);

      const result = await WalletService.executeBlockchainTransfer(
        merchantPrivateKeyHex,
        merchantWallet.address || 'tlq1',
        receipt.amount,
        receipt.currency
      );

      receipt.settlementStatus = 'confirmed';
      receipt.txHash = result.hash;
      receipt.confirmedAt = Date.now();
      
      this.pendingReceipts.delete(receipt.receiptId);
      this.pendingTransactions.delete(tx.id);
      
      await OfflineSyncService.broadcastReceipt(receipt);

    } catch (err: any) {
      receipt.retryCount = (receipt.retryCount || 0) + 1;
      if (receipt.retryCount > 3) {
        receipt.settlementStatus = 'failed';
        receipt.chain = err.message || 'WDK Error';
      } else {
        receipt.settlementStatus = 'retrying';
      }
      await OfflineSyncService.broadcastReceipt(receipt);
    }
  }

  static async processSettlementBatch(merchantId: string): Promise<Settlement | null> {
    return null;
  }
}
