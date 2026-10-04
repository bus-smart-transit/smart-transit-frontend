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

  async startConductorShift() {
    return await this.request('/conductor/shift/start', 'POST');
  }

  async endConductorShift() {
    return await this.request('/conductor/shift/end', 'POST');
  }

  async getTripOccupancy() {
    return await this.request('/conductor/trips/current/occupancy', 'GET');
  }

  // Batch 27 Part 2, Task 6: where the bus is, as a boarding point on this trip's route. No arguments: the server
  // uses the bus's own latest position, never one sent by the client.
  async getBoardingPoint() {
    return await this.request('/conductor/trips/current/boarding-point', 'GET');
  }

  async getOccupancyByStop() {
    return await this.request('/conductor/trips/current/occupancy/by-stop', 'GET');
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

  async checkoutOnsite(payload) {
    return await this.request('/conductor/checkout', 'POST', payload);
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
