import { Transaction, TransactionCategory, TransactionStatus, PaymentRequest, AIInsight } from '@/lib/shared-types';
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
    amount: number,
    assetId: string,
    assetTicker: string,
    assetName: string,
    targetDid?: string,
    sessionId?: string
  ): { request: PaymentRequest; uri: string } {
    const actualSessionId = sessionId || `sess_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const currency = assetTicker === 'L-BTC' ? 'LiquidBitcoin' : 'USDT';
    const request: PaymentRequest = {
      requestId: `req_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`,
      merchantDid,
      amount,
      currency,
      timestamp: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      targetDid,
      sessionId: actualSessionId,
      assetId,
      assetTicker,
      assetName
    };
    
    const uri = `kickpay://pay?merchant=${merchantDid}&amount=${amount}&assetId=${assetId}&assetTicker=${assetTicker}&assetName=${encodeURIComponent(assetName)}&request=${request.requestId}&session=${actualSessionId}`;
    
    return { request, uri };
  }

  static async createTransaction(
    senderWalletDid: string,
    receiverWalletDid: string,
    amount: number,
    category: TransactionCategory,
    privateKeyHex: string,
    sessionId?: string,
    assetId?: string,
    assetTicker?: string,
    assetName?: string
  ): Promise<Transaction> {
    
    const balance = await WalletService.getBalance(senderWalletDid);
    
    const finalAssetId = assetId || 'b612eb46313a2cd6ebabd8b7a8eed5696e29898b87a43bff41c94f51acef9d73';
    const finalAssetTicker = assetTicker || 'L-USDT';
    const finalAssetName = assetName || 'Tether USD';

    // Perform independent validation for the specific asset
    if (finalAssetTicker === 'L-BTC') {
      if (balance.lbtc === undefined) {
        throw new InsufficientFundsError('Unable to verify wallet balance.');
      }
      if (balance.lbtc < amount) {
        throw new InsufficientFundsError(`Insufficient Funds. Required: ${amount.toFixed(8)} L-BTC, Available: ${balance.lbtc.toFixed(8)} L-BTC.`);
      }
    } else if (finalAssetTicker === 'L-USDT' || finalAssetTicker === 'USDT') {
      if (balance.usdt === undefined) {
        throw new InsufficientFundsError('Unable to verify wallet balance.');
      }
      if (balance.usdt < amount) {
        throw new InsufficientFundsError(`Insufficient Funds. Required: ${amount.toFixed(2)} USDT, Available: ${balance.usdt.toFixed(2)} USDT.`);
      }
    } else {
      // General custom assets check
      const foundAsset = balance.assets.find(a => a.assetId === finalAssetId);
      const available = foundAsset ? foundAsset.amount : 0;
      if (available < amount) {
        throw new InsufficientFundsError(`Insufficient Funds. Required: ${amount} ${finalAssetTicker}, Available: ${available} ${finalAssetTicker}.`);
      }
    }

    const currency: 'USDT' | 'LiquidBitcoin' = finalAssetTicker === 'L-BTC' ? 'LiquidBitcoin' : 'USDT';
    const nonce = crypto.randomUUID();
    const txBase = {
      id: `tx_${Date.now()}_${nonce}`,
      senderWallet: senderWalletDid,
      receiverWallet: receiverWalletDid,
      amount,
      currency,
      assetId: finalAssetId,
      assetTicker: finalAssetTicker,
      assetName: finalAssetName,
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

  static async submitTransaction(tx: Transaction): Promise<{ insight: AIInsight | null }> {
    await this.validateTransaction(tx);
    await OfflineSyncService.broadcastTransaction(tx);
    
    const insight = await FraudDetectionService.analyzeTransaction(tx);
    return { insight };
  }
}
