import Dexie, { type Table } from 'dexie';
import { 
} from '@/lib/shared-types';

export interface ChatMessage {
  id: string;
  senderDid: string;
  content: string;
  timestamp: number;
  signature: string;
}

export class KickPayDatabase extends Dexie {
  transactions!: Table<unknown, string>;
  chatMessages!: Table<ChatMessage, string>;

  constructor() {
    super('KickPayDatabase');
    
    // Schema version 1
    this.version(1).stores({
      clubs: 'id, name, createdAt',
      members: 'id, did, role, joinedAt',
      roster: 'id, playerId, name, position, guardianDid',
      matches: 'id, clubId, tournamentId, status',
      tournaments: 'id, clubId, name, status',
      predictionPools: 'id, tournamentId, matchId, status'
    });

    // Schema version 2 - Adds local ledger transactions table
    this.version(2).stores({
      clubs: 'id, name, createdAt',
      members: 'id, did, role, joinedAt',
      roster: 'id, playerId, name, position, guardianDid',
      matches: 'id, clubId, tournamentId, status',
      tournaments: 'id, clubId, name, status',
      predictionPools: 'id, tournamentId, matchId, status',
      transactions: 'id, txHash, senderDid, recipientDid, currency, type, timestamp'
    });

    // Schema version 3 - Adds P2P Chat Messages table for sync-swarms
    this.version(3).stores({
      clubs: 'id, name, createdAt',
      members: 'id, did, role, joinedAt',
      roster: 'id, playerId, name, position, guardianDid',
      matches: 'id, clubId, tournamentId, status',
      tournaments: 'id, clubId, name, status',
      predictionPools: 'id, tournamentId, matchId, status',
      transactions: 'id, txHash, senderDid, recipientDid, currency, type, timestamp',
      chatMessages: 'id, senderDid, timestamp'
    });
  }
}

export const db = new KickPayDatabase();
export default db;
