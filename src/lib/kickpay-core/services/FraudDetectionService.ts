import { Transaction, AIInsight } from '@/lib/shared-types';
import { OfflineSyncService } from './OfflineSyncService';

/**
 * FraudDetectionService encapsulates local AI anomaly detection.
 * It strictly returns AIInsights without modifying the transaction or blocking execution.
 */
export class FraudDetectionService {
  private static recentTransactions: Transaction[] = [];

  static async analyzeTransaction(tx: Transaction): Promise<AIInsight | null> {
    // Basic AI anomaly detection simulation
    
    // 1. High Spending Insight
    if (tx.amount > 1000) {
      return this.generateInsight(tx.id, 'High Spending Warning', 'Transaction amount is unusually large for this context.', 0.88);
    }

    // 2. Duplicate / Replay Risk
    const isDuplicate = this.recentTransactions.some(
      (recent) => recent.senderWallet === tx.senderWallet && recent.amount === tx.amount && (Date.now() - recent.timestamp < 10000)
    );

    this.recentTransactions.push(tx);
    
    if (isDuplicate) {
      return this.generateInsight(tx.id, 'Duplicate Transaction Risk', 'A transaction with the identical amount was sent seconds ago.', 0.95);
    }

    // Return null if no anomaly is detected
    return null;
  }

  private static generateInsight(txId: string, title: string, description: string, confidence: number): AIInsight {
    return {
      id: `insight_${Date.now()}_${crypto.randomUUID().substring(0,8)}`,
      targetDid: txId,
      type: 'fraud_alert',
      confidenceScore: confidence,
      description: `${title}: ${description}`,
      generatedAt: Date.now()
    };
  }
}
