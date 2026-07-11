import { Ticket, Transaction } from '@/lib/shared-types';
import { PaymentService } from './PaymentService';
import { OfflineSyncService } from './OfflineSyncService';

/**
 * TicketService manages offline digital tickets.
 */
export class TicketService {
  /**
   * Purchases a ticket by orchestrating a payment through the unified pipeline.
   */
  static async purchaseTicket(
    fanDid: string,
    merchantDid: string,
    matchId: string,
    tier: Ticket['tier'],
    priceUSDT: number,
    fanPrivateKeyHex: string
  ): Promise<{ ticket: Ticket; transaction: Transaction }> {
    
    // 1. Process payment through the unified financial pipeline
    const transaction = await PaymentService.createTransaction(
      fanDid,
      merchantDid,
      priceUSDT,
      'ticket',
      fanPrivateKeyHex
    );
    await PaymentService.submitTransaction(transaction);

    // 2. Generate the immutable ticket ownership record
    const ticket: Ticket = {
      id: `ticket_${Date.now()}_${crypto.randomUUID()}`,
      matchId,
      ownerDid: fanDid,
      tier,
      priceUSDT,
      isScanned: false,
      purchaseTxId: transaction.id
    };

    // 3. Broadcast the ticket ownership to the mesh network
    await OfflineSyncService.broadcastTicket(ticket);

    return { ticket, transaction };
  }

  static async scanTicket(ticket: Ticket): Promise<boolean> {
    if (ticket.isScanned) {
      throw new Error('Ticket has already been scanned.');
    }
    ticket.isScanned = true;
    await OfflineSyncService.broadcastTicket(ticket);
    return true;
  }
}
