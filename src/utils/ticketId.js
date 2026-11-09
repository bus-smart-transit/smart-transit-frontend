/**
 * Batch 51 item 8 (user, 2026-11-09): the Ticket ID a Chauffeur types when a passenger cannot show the QR: the first
 * 8 characters of the ticket's uuid, in capitals (the server's TicketBoarding::ticketId). Separate from the tracking
 * code, which only follows the bus.
 */
export const ticketIdOf = (uuid) => String(uuid || '').slice(0, 8).toUpperCase();
