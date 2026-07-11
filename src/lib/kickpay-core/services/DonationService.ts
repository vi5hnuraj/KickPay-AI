import { Donation, Transaction } from '@/lib/shared-types';
import { PaymentService } from './PaymentService';
import { OfflineSyncService } from './OfflineSyncService';

/**
 * DonationService handles charitable and fundraising capabilities.
 */
export class DonationService {
  /**
   * Orchestrates a charitable donation to a club using the unified payment pipeline.
   */
  static async donateToClub(
    fanDid: string,
    clubDid: string,
    clubId: string,
    amountUSDT: number,
    message: string,
    fanPrivateKeyHex: string
  ): Promise<{ donation: Donation; transaction: Transaction }> {
    
    // 1. Route the donation through the standard financial pipeline
    const transaction = await PaymentService.createTransaction(
      fanDid,
      clubDid,
      amountUSDT,
      'donation',
      fanPrivateKeyHex
    );
    await PaymentService.submitTransaction(transaction);

    // 2. Create the Donation metadata record
    const donation: Donation = {
      id: `donation_${Date.now()}_${crypto.randomUUID()}`,
      donorDid: fanDid,
      clubId,
      amountUSDT,
      message,
      timestamp: Date.now(),
      txId: transaction.id
    };

    // 3. Replicate the donation record across the mesh
    await OfflineSyncService.broadcastDonation(donation);

    return { donation, transaction };
  }
}
