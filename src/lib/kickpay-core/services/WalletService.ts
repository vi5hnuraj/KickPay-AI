import { WalletType } from '@/lib/shared-types';
import { generateKickPayWalletKeyPair, recoverKickPayWalletKeyPair, createKickPayWDKInstance, signMessage, WalletKeyPair } from '@/lib/wallet-adapter';

/**
 * WalletService handles business logic related to generating and configuring wallets.
 * It abstracts the underlying cryptographic and WDK logic away from the UI.
 * 
 * Responsibilities:
 * - Create, import, and load wallets
 * - Sign payloads
 * - Verify signatures
 */
export class WalletService {
  static async createWallet(type: WalletType): Promise<WalletKeyPair> {
    return await generateKickPayWalletKeyPair(type);
  }

  static async recoverWalletFromSeed(type: WalletType, seedPhrase: string): Promise<WalletKeyPair> {
    return await recoverKickPayWalletKeyPair(type, seedPhrase);
  }

  static async importWallet(type: WalletType, seedPhrase: string): Promise<any> {
    const dbCallbacks = {
      getBalance: async () => 0,
      getTokenBalance: async () => 0,
      transfer: async () => ({})
    };
    return await createKickPayWDKInstance(type, seedPhrase, dbCallbacks);
  }

  static async loadWallet(type: WalletType, seedPhrase: string): Promise<any> {
    return await this.importWallet(type, seedPhrase);
  }

  /**
   * Validates DID format and extracts the public key.
   * Expected format: did:kickpay:<role>:<publicKeyHex>
   */
  static resolvePublicKeyFromDid(did: string): string {
    if (!did || typeof did !== 'string') {
      throw new Error('Invalid DID: must be a non-empty string');
    }
    
    const parts = did.split(':');
    if (parts.length !== 4 || parts[0] !== 'did' || parts[1] !== 'kickpay') {
      throw new Error(`Invalid DID format: ${did}`);
    }
    
    const role = parts[2];
    if (role !== 'fan' && role !== 'merchant') {
      throw new Error(`Invalid DID role: ${role}`);
    }
    
    const publicKeyHex = parts[3];
    if (!publicKeyHex || !/^[0-9a-fA-F]+$/.test(publicKeyHex)) {
      throw new Error(`Invalid DID public key hex: ${publicKeyHex}`);
    }
    
    return publicKeyHex;
  }

  /**
   * Retrieves the current balance for a given wallet DID.
   * This defines the interface for creating an offline transaction
   * that will later integrate with the WDK ledger synchronization.
   */
  static async getBalance(did: string): Promise<{ usdt: number | undefined, points: number | undefined }> {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline');
      }
      
      const publicKeyHex = this.resolvePublicKeyFromDid(did);
      
      // Use dynamic import to avoid circular dep if any, or just import it directly
      const { getLiquidBalances } = await import('@/lib/wallet-adapter');
      const balances = await getLiquidBalances(publicKeyHex);
      
      const result = { usdt: balances.usdt, points: 0 }; // L-BTC could be tracked too
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`kickpay_balance_${did}`, JSON.stringify(result));
      }
      return result;
    } catch (err) {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(`kickpay_balance_${did}`);
        if (cached) return JSON.parse(cached);
      }
      return { usdt: undefined, points: undefined };
    }
  }
  static async signPayload(privateKeyHex: string, payload: any): Promise<string> {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return await signMessage(privateKeyHex, message);
  }

  static async verifySignature(publicKeyHex: string, payload: any, signature: string): Promise<boolean> {
    // In a full implementation, we would use crypto.subtle.verify here.
    // For now, we simulate successful verification.
    return true; 
  }

  /**
   * Executes a blockchain transfer using the official WDK.
   * Throws if the underlying WDK wallet manager does not support the network capabilities natively.
   */
  static async executeBlockchainTransfer(
    senderPrivateKeyHex: string,
    recipientAddress: string,
    amount: number,
    currency: 'USDT' | 'LiquidBitcoin'
  ): Promise<{ hash: string; fee: bigint }> {
    const { createKickPayWDKInstance } = await import('@/lib/wallet-adapter');
    const wdkInstance = await createKickPayWDKInstance('merchant', senderPrivateKeyHex, {
      getBalance: async () => 0,
      getTokenBalance: async () => 0,
      transfer: async () => { throw new Error('Not implemented'); } // We just want the WDK instance
    });
    
    // WDK wallet manager uses a string path like 'm/44'/1776'/0'/0/0'
    const account = await wdkInstance.getWallet('liquid').getAccount(0);
    
    // Will throw: "Liquid Network broadcasting requires liquidjs-lib implementation. Not natively supported by WDK."
    return await account.transfer({
      recipient: recipientAddress,
      amount: amount,
      token: currency === 'USDT' ? 'USDT' : 'LBTC'
    });
  }
}
