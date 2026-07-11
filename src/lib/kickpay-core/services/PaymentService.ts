import { Transaction, TransactionCategory, TransactionStatus, PaymentRequest } from '@/lib/shared-types';
import { WalletService } from './WalletService';
import { OfflineSyncService } from './OfflineSyncService';
import { FraudDetectionService } from './FraudDetectionService';

export class InsufficientFundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

/**
 * PaymentService handles the business rules of generating and validating transactions.
 * It ensures that transactions are properly formatted before handing them to the sync layer.
 * 
 * Responsibilities:
 * - Create and sign transactions
 * - Validate transactions strictly before sync
 * - Submit transactions to the mesh network
 * - Generate receipt requests
 * - Generate payment requests
 */
export class PaymentService {
  static createPaymentRequest(
    merchantDid: string,
    amountUSDT: number,
    targetDid?: string,
    sessionId?: string
  ): { request: PaymentRequest, uri: string } {
    const actualSessionId = sessionId || `sess_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const request: PaymentRequest = {
      requestId: `req_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`,
      merchantDid,
      amount: amountUSDT,
      currency: 'USDT',
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      targetDid,
      sessionId: actualSessionId
    };
    
    const uri = `kickpay://pay?merchant=${merchantDid}&amount=${amountUSDT}&request=${request.requestId}&session=${actualSessionId}`;
    
    return { request, uri };
  }

  static async createTransaction(
    senderWalletDid: string,
    receiverWalletDid: string,
    amountUSDT: number,
    category: TransactionCategory,
    privateKeyHex: string,
    sessionId?: string
  ): Promise<Transaction> {
    
    const balance = await WalletService.getBalance(senderWalletDid);
    if (balance.usdt === undefined) {
      throw new InsufficientFundsError('Unable to verify wallet balance.');
    }
    if (balance.usdt < amountUSDT) {
      throw new InsufficientFundsError(`Insufficient Funds. Required: ${amountUSDT} USDT, Available: ${balance.usdt} USDT.`);
    }

    const nonce = crypto.randomUUID();
    const txBase = {
      id: `tx_${Date.now()}_${nonce}`,
      senderWallet: senderWalletDid,
      receiverWallet: receiverWalletDid,
      amount: amountUSDT,
      currency: 'USDT' as const,
      category,
      status: 'offline_queued' as TransactionStatus,
      timestamp: Date.now(),
      nonce,
      settlementState: 'unsettled' as const,
      sessionId
    };

    const signature = await WalletService.signPayload(privateKeyHex, txBase);
    
    return { ...txBase, signature };
  }

  static async validateTransaction(tx: Transaction): Promise<boolean> {
    if (tx.amount <= 0) {
      throw new Error('Transaction amount must be strictly greater than zero.');
    }
    
    const { signature, ...txBase } = tx;
    const publicKeyHex = tx.senderWallet.split(':').pop() || '';
    
    const isValid = await WalletService.verifySignature(publicKeyHex, txBase, signature);
    if (!isValid) {
      throw new Error('Transaction signature verification failed.');
    }

    return true;
  }

  static async submitTransaction(tx: Transaction): Promise<{ insight: any | null }> {
    await this.validateTransaction(tx);
    await OfflineSyncService.broadcastTransaction(tx);
    
    const insight = await FraudDetectionService.analyzeTransaction(tx);
    return { insight };
  }
}
