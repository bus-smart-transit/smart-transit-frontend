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

  // S2 (Batch 12): mirrors declineDriverTrip() for the conductor role.
  async declineConductorTrip(tripId, payload = {}) {
    return await this.request(`/conductor/trips/${tripId}/decline`, 'PATCH', payload);
  }

  // Batch 15, Item 1/7: explicit Accept counterpart for the conductor role.
  async acceptConductorTrip(tripId) {
    return await this.request(`/conductor/trips/${tripId}/accept`, 'PATCH');
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
}

export default new ConductorService();
