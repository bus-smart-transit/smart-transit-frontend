import { StaffBaseService } from './StaffBaseService';
import { TokenManager } from '../../utils/TokenManager.js';

/**
 * Conductor-only endpoints. See StaffBaseService.js for the ISP rationale.
 */
class ConductorService extends StaffBaseService {
  async logoutConductor() {
    try {
      return await this.request('/conductor/logout', 'DELETE');
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  async getConductorTrip() {
    try {
      return await this.request('/conductor/trips/current', 'GET');
    } catch (err) {
      if (this.getResponseStatus(err) === 404) return { data: null };
      throw err;
    }
  }

  async getConductorTrips(statusFilter = 'all') {
    return await this.request('/conductor/trips', 'GET', { status_filter: statusFilter });
  }

  async getConductorShiftStatus() {
    return await this.request('/conductor/shift/status', 'GET');
  }

  // Batch 29: the cash the Chauffeur declares to be carrying at the start (default 0); expected cash starts from it.
  async startConductorShift(openingCash = 0) {
    return await this.request('/conductor/shift/start', 'POST', { opening_cash: Number(openingCash) || 0 });
  }

  // Batch 29: the cash the Chauffeur counts and hands over; the Operator confirms it later.
  async endConductorShift(closingCash) {
    const amount = Number(closingCash);
    return await this.request('/conductor/shift/end', 'POST', Number.isFinite(amount) && closingCash !== '' && closingCash != null ? { closing_cash: amount } : {});
  }

  async getTripOccupancy() {
    return await this.request('/conductor/trips/current/occupancy', 'GET');
  }

  // Batch 27 Part 2, Task 6: where the bus is, as a boarding point on this trip's route. No arguments: the server
  // uses the bus's own latest position, never one sent by the client.
  async getBoardingPoint() {
    return await this.request('/conductor/trips/current/boarding-point', 'GET');
  }

  // Passenger In (2026-10-26): the server keeps the bus position now, snapped back to the last stop passed.
  async checkInPassenger() {
    return await this.request('/conductor/trips/current/check-ins', 'POST', {});
  }

  // The check-ins of the current trip still waiting for their fare.
  async getCheckIns() {
    return await this.request('/conductor/trips/current/check-ins', 'GET');
  }

  async getOccupancyByStop() {
    return await this.request('/conductor/trips/current/occupancy/by-stop', 'GET');
  }

  // 2026-10-27 (§7): a destination group got off (the server checks every ticket again).
  async confirmDropOffGroup(destinationKey, ticketIds) {
    return await this.request('/conductor/trips/current/drop-off-groups/confirm', 'POST', { destination_key: destinationKey, ticket_ids: ticketIds });
  }

  async getCurrentPassengers() {
    return await this.request('/conductor/trips/current/passengers', 'GET');
  }

  async scanTicket(uuid) {
    return await this.request('/conductor/tickets/scan', 'POST', { ticket_uuid: uuid });
  }

  async scanGroupTickets(transactionRef) {
    return await this.request('/conductor/tickets/scan-group', 'POST', { transaction_reference: transactionRef });
  }

  async recordAlighting(ticketId) {
    return await this.request(`/conductor/tickets/${ticketId}/alight`, 'POST');
  }

  // Batch 28: a shift block (or one standalone trip) is ONE card; accept or decline it once.
  // The leg-level declineConductorTrip/acceptConductorTrip calls were removed in Batch 27 Part 2: nothing used them.
  async getAssignments() {
    return await this.request('/conductor/assignments', 'GET');
  }

  async acceptAssignment(key) {
    return await this.request(`/conductor/assignments/${key}/accept`, 'PATCH');
  }

  async declineAssignment(key, payload = {}) {
    return await this.request(`/conductor/assignments/${key}/decline`, 'PATCH', payload);
  }

  // Batch 15, Item 9: "Available" toggle for the conductor role.
  async updateConductorAvailability(available) {
    return await this.request('/conductor/availability', 'PATCH', { available });
  }

  async getConductorPin() {
    return await this.request('/conductor/pin', 'GET');
  }

  async verifyConductorPin(pin) {
    return await this.request('/conductor/pin/verify', 'POST', { pin_code: pin });
  }

  async checkoutOnsite(payload, idempotencyKey) {
    const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {};
    return await this.request('/conductor/checkout', 'POST', payload, headers);
  }

  // The exact fare of a cash sale before it is made; nothing is reserved or recorded.
  async quoteOnsite(item) {
    return await this.request('/conductor/checkout/quote', 'POST', item);
  }

  async getOnsiteDiscountTypes() {
    return await this.request('/conductor/discount-types', 'GET');
  }

  // Batch 18: Shift Block Hand-off System.
  async getMyShiftBlocks() {
    return await this.request('/conductor/shift-blocks', 'GET');
  }

  async getShiftBlockHandoffEligibility(shiftBlockId) {
    return await this.request(`/conductor/shift-blocks/${shiftBlockId}/handoff-eligibility`, 'GET');
  }

  async initiateShiftBlockHandoff(shiftBlockId) {
    return await this.request(`/conductor/shift-blocks/${shiftBlockId}/initiate-handoff`, 'POST');
  }
}

export default new ConductorService();
