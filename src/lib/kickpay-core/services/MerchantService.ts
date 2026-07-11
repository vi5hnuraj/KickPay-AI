import { Merchant } from '@/lib/shared-types';
import { OfflineSyncService } from './OfflineSyncService';

/**
 * MerchantService is the core commerce layer for managing POS units and vendors.
 */
export class MerchantService {
  private static merchants: Map<string, Merchant> = new Map();

  static async registerMerchant(
    did: string,
    name: string,
    category: Merchant['category'],
    location: string,
    walletAddress: string
  ): Promise<Merchant> {
    const merchant: Merchant = {
      id: `merchant_${Date.now()}_${crypto.randomUUID()}`,
      did,
      name,
      category,
      location,
      walletAddress
    };

    this.merchants.set(merchant.id, merchant);
    await OfflineSyncService.broadcastMerchant(merchant);
    return merchant;
  }

  static getMerchant(id: string): Merchant | undefined {
    return this.merchants.get(id);
  }

  static generateMerchantQR(merchant: Merchant): string {
    // Generates a KickPay schema URI containing connection details
    return `kickpay:merchant:${merchant.id}?did=${merchant.did}&category=${merchant.category}`;
  }
}
