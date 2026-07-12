export type WalletType = 'fan' | 'merchant' | 'club' | 'organizer' | 'referee';

export interface Wallet {
  id: string;
  did: string;
  type: WalletType;
  address: string; // WDK/Tether address
  balanceUSDT: number;
  createdAt: number;
}

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'offline_queued';
export type TransactionCategory = 'ticket' | 'food' | 'merchandise' | 'donation' | 'tip' | 'prize' | 'peer_transfer';

export interface Transaction {
  id: string;
  senderWallet: string;
  receiverWallet: string;
  amount: number;
  currency: 'USDT' | 'LiquidBitcoin';
  category: TransactionCategory;
  status: TransactionStatus;
  timestamp: number;
  nonce: string;
  settlementState: 'unsettled' | 'pending_settlement' | 'settled';
  txHash?: string; // Null if offline_queued
  signature: string; // Cryptographic proof from sender
  posSessionId?: string; // If processed via a Merchant POS
  sessionId?: string; // Tracks the targeted payment session lifecycle
  assetId?: string;
  assetTicker?: string;
  assetName?: string;
}

export interface PaymentRequest {
  requestId: string;
  merchantDid: string;
  amount: number;
  currency: 'USDT' | 'LiquidBitcoin';
  timestamp: number;
  expiresAt: number;
  sessionId?: string;
  targetDid?: string; // The Customer DID this request is uniquely targeted at
  assetId?: string;
  assetTicker?: string;
  assetName?: string;
}

export interface PaymentSessionHandshake {
  merchantDid: string;
  customerDid: string;
  sessionId: string;
  timestamp: number;
}

export interface Receipt {
  receiptId: string;
  transactionId: string;
  merchantId: string;
  amount: number;
  currency: 'USDT' | 'LiquidBitcoin';
  timestamp: number;
  merchantSignature: string;
  verificationStatus: 'verified' | 'failed' | 'pending';
  sessionId?: string;
  settlementStatus?: 'pending' | 'submitting' | 'waiting_confirmation' | 'confirmed' | 'failed' | 'retrying';
  chain?: string;
  txHash?: string;
  confirmedAt?: number;
  retryCount?: number;
  assetId?: string;
  assetTicker?: string;
  assetName?: string;
}

export interface POSSession {
  id: string;
  merchantId: string;
  deviceId: string; // Pear Runtime device identifier
  startedAt: number;
  endedAt?: number;
  totalTransactions: number;
  totalVolumeUSDT: number;
  isOffline: boolean;
}

export interface Settlement {
  settlementId: string;
  settlementBatchId: string;
  merchantId: string;
  transactionIds: string[];
  receiptIds: string[];
  totalAmount: number;
  currency: 'USDT' | 'LiquidBitcoin';
  settlementState: 'pending' | 'submitting' | 'waiting_confirmation' | 'confirmed' | 'failed' | 'retrying';
  createdAt: number;
  sessionId?: string;
  txHash?: string;
  chain?: string;
  confirmedAt?: number;
  retryCount?: number;
}

export interface Merchant {
  id: string;
  did: string;
  name: string;
  category: 'food' | 'merchandise' | 'tickets' | 'general';
  location: string; // e.g., "North Stand, Gate 4"
  walletAddress: string;
}

export interface Ticket {
  id: string;
  matchId: string; // Keep as string for future/generic reference
  ownerDid: string;
  tier: 'general' | 'vip' | 'hospitality';
  priceUSDT: number;
  isScanned: boolean;
  purchaseTxId: string;
}

export interface Donation {
  id: string;
  donorDid: string;
  clubId: string;
  amountUSDT: number;
  message?: string;
  timestamp: number;
  txId: string;
}

export interface PrizeDistribution {
  id: string;
  tournamentId: string;
  recipientTeamId: string;
  recipientWallet: string;
  amountUSDT: number;
  distributedAt: number;
  txHash: string;
}

export type AIInsightType = 'fraud_alert' | 'spending_trend' | 'sales_forecast' | 'anomaly';

export interface AIInsight {
  id: string;
  targetDid: string;
  type: AIInsightType;
  confidenceScore: number; // 0.0 to 1.0
  description: string;
  generatedAt: number;
  suggestedAction?: string;
}
