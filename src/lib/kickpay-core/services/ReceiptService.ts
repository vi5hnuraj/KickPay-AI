import { Transaction, Receipt } from '@/lib/shared-types';
import { WalletService } from './WalletService';
import { OfflineSyncService } from './OfflineSyncService';
import { SettlementService } from './SettlementService';

export class ReceiptService {
  private static processedTransactions = new Set<string>();

  /**
   * 1. Verifies the incoming signed transaction.
   * 2. Confirms merchant authorization.
   * 3. Prevents duplicates.
   * 4. Generates immutable receipt.
   * 5. Appends to merchant ledger.
   * 6. Queues for settlement.
   */
  static async processIncomingTransaction(
    tx: Transaction,
    merchantId: string,
    merchantPrivateKeyHex: string
  ): Promise<Receipt> {
    // 3. Prevent duplicate receipts
    if (this.processedTransactions.has(tx.id)) {
      throw new Error('Duplicate transaction detected. Receipt already generated.');
    }

    // 1. Verify the incoming signed transaction
    if (tx.amount <= 0) {
      throw new Error('Invalid transaction amount');
    }
    const { signature, ...txBase } = tx;
    
    // Resolve DID to public key for verification
    const senderPubKey = WalletService.resolvePublicKeyFromDid(tx.senderWallet);
    const isValid = await WalletService.verifySignature(senderPubKey, txBase, signature);
    
    if (!isValid) {
      throw new Error('Invalid transaction signature from sender.');
    }

    // 2. Confirm the merchant is authorized
    if (!tx.receiverWallet.includes(merchantId)) {
      throw new Error('Transaction receiver does not match this merchant.');
    }

    // 4. Generate an immutable receipt referencing the original transaction
    const receiptBase = {
      receiptId: `rcpt_${Date.now()}_${crypto.randomUUID()}`,
      transactionId: tx.id,
      merchantId,
      amount: tx.amount,
      currency: tx.currency,
      timestamp: Date.now(),
      verificationStatus: 'verified' as const,
      sessionId: tx.sessionId,
      assetId: tx.assetId,
      assetTicker: tx.assetTicker,
      assetName: tx.assetName
    };

    const merchantSignature = await WalletService.signPayload(merchantPrivateKeyHex, receiptBase);
    const receipt: Receipt = { ...receiptBase, merchantSignature };

    // Mark as processed to prevent duplicates
    this.processedTransactions.add(tx.id);

    // 5. Append the receipt to the merchant ledger (broadcast)
    await OfflineSyncService.broadcastReceipt(receipt);

    // 6. Queue the receipt for settlement
    SettlementService.queueForSettlement(tx, receipt);

    return receipt;
  }
}
