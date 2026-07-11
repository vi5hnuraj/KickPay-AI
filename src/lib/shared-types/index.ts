export type ClubRole = 'owner' | 'admin' | 'coach' | 'player' | 'parent' | 'volunteer';

export interface Club {
  id: string;
  name: string;
  crestUri?: string;
  location?: string;
  ageCategory?: string;
  createdAt: number;
}

export interface Member {
  id: string;
  did: string;
  role: ClubRole;
  joinedAt: number;
  invitedBy?: string;
}

export interface PlayerStats {
  height?: number;
  weight?: number;
  preferredFoot?: 'left' | 'right' | 'both';
}

export interface RosterEntry {
  id: string;
  playerId: string;
  name: string;
  position: string;
  jerseyNumber?: number;
  guardianDid?: string; // parent-controlled field for minors
  consentFlags: {
    photoConsent: boolean;
    dataShareConsent: boolean;
    minorSafetyConsent: boolean;
  };
  stats?: PlayerStats;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
}

export type MatchEventType = 'goal' | 'yellow_card' | 'red_card' | 'substitution' | 'possession' | 'period_start' | 'period_end';

export interface MatchEvent {
  id: string;
  type: MatchEventType;
  minute: number;
  playerId?: string;
  playerOutId?: string; // for substitution
  details?: string;
  timestamp: number;
  causalClock: number; // Lamport timestamp/causal ordering
  loggedByDid: string;
}

export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export interface Match {
  id: string;
  clubId: string;
  tournamentId?: string;
  homeTeam: string;
  awayTeam: string;
  status: MatchStatus;
  startedAt?: number;
  score?: {
    home: number;
    away: number;
  };
  events: MatchEvent[];
  finalResult?: {
    scoreHome: number;
    scoreAway: number;
    playerRatings?: Record<string, number>; // player rating by QVAC / Coach
  };
}

export type TournamentFormat = 'knockout' | 'round_robin' | 'hybrid';
export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed';

export interface Fixture {
  id: string;
  matchId: string;
  round: number;
  stageName?: string;
}

export interface Tournament {
  id: string;
  clubId: string;
  name: string;
  format: TournamentFormat;
  entryFee: number; // in USDT or Points
  isRealMoney: boolean;
  maxParticipants: number;
  targetPool?: number;
  status: TournamentStatus;
  teams: string[]; // list of teamIds or teamNames
  fixtures: Fixture[];
  createdAt: number;
}

export type PredictionMode = 'points' | 'real-money';

export type PredictionMarketType = 
  | 'match_winner' 
  | 'correct_score' 
  | 'first_goalscorer' 
  | 'total_goals' 
  | 'btts' 
  | 'player_of_the_match' 
  | 'tournament_champion';

export interface Prediction {
  id: string;
  participantDid: string;
  marketType: PredictionMarketType;
  selection: string; // e.g. "home", "2-1", "Sarah"
  submittedAt: number;
  signedTxRef?: string; // WDK transaction signature / hash if real-money
}

export interface PredictionPool {
  id: string;
  tournamentId?: string;
  matchId?: string;
  name: string;
  mode: PredictionMode;
  entryFee: number;
  maxParticipants: number;
  targetPool: number;
  predictions: Record<string, Prediction[]>; // key is marketType
  settlementState: 'pending' | 'submitting' | 'waiting_confirmation' | 'confirmed' | 'failed' | 'retrying';
  winners?: string[]; // array of participantDids
  resolution?: {
    finalResult: string;
    payouts: Record<string, number>; // participantDid -> payout amount
  };
}

export interface DIDChallenge {
  nonce: string;
  timestamp: number;
}

export interface DIDAuthResponse {
  did: string;
  signature: string;
  nonce: string;
}

export interface WalletTransaction {
  id: string;
  txHash: string;
  senderDid: string;
  recipientDid: string;
  amount: number;
  currency: 'USDT' | 'Points';
  type: 'faucet' | 'entry_fee' | 'payout' | 'transfer' | 'purchase';
  timestamp: number;
  signature: string;
}

export * from './auth';
export * from './kickpay';
