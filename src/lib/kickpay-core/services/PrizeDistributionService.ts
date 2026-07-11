import { PrizeDistribution, Transaction } from '@/lib/shared-types';
import { PaymentService } from './PaymentService';
import { OfflineSyncService } from './OfflineSyncService';

/**
 * PrizeDistributionService handles tournament payouts.
 */
export class PrizeDistributionService {
  /**
   * Distributes tournament prize pools using the standard payment pipeline.
   */
  static async distributeTeamPayout(
    organizerDid: string,
    teamWalletDid: string,
    tournamentId: string,
    teamId: string,
    amountUSDT: number,
    organizerPrivateKeyHex: string
  ): Promise<{ distribution: PrizeDistribution; transaction: Transaction }> {
    
    // 1. Route the payout through the standard financial pipeline
    const transaction = await PaymentService.createTransaction(
      organizerDid,
      teamWalletDid,
      amountUSDT,
      'prize',
      organizerPrivateKeyHex
    );
    await PaymentService.submitTransaction(transaction);

    // 2. Create the distribution metadata record
    const distribution: PrizeDistribution = {
      id: `prize_${Date.now()}_${crypto.randomUUID()}`,
      tournamentId,
      recipientTeamId: teamId,
      recipientWallet: teamWalletDid,
      amountUSDT,
      distributedAt: Date.now(),
      txHash: transaction.id // Offline tracking reference
    };

    // 3. Replicate the distribution record
    await OfflineSyncService.broadcastPrizeDistribution(distribution);

    return { distribution, transaction };
  }
}
