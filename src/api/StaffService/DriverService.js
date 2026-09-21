import { StaffBaseService } from './StaffBaseService';
import { TokenManager } from '../../utils/TokenManager.js';

/**
 * Driver-only endpoints. See StaffBaseService.js for the ISP rationale.
 */
class DriverService extends StaffBaseService {
  async logoutDriver() {
    try {
      return await this.request('/driver/logout', 'DELETE');
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  async getDriverTrips(statusFilter = 'all') {
    return await this.request('/driver/trips', 'GET', { status_filter: statusFilter });
  }

  async getCurrentTrip() {
    try {
      return await this.request('/driver/trips/current', 'GET');
    } catch (err) {
      if (this.getResponseStatus(err) === 404) return { data: null };
      throw err;
    }
  }

  async getCurrentTripStops() {
    return await this.request('/driver/trips/current/stops', 'GET');
  }

  async getStopDetail(stopId) {
    return await this.request(`/driver/trips/current/stops/${stopId}`, 'GET');
  }

  async acknowledgeStop(stopId) {
    return await this.request(`/driver/trips/current/stops/${stopId}/acknowledge`, 'POST');
  }

  async departTrip(tripId) {
    return await this.request(`/driver/trips/${tripId}/depart`, 'PATCH');
  }

  async startBoardingTrip(tripId) {
    return await this.request(`/driver/trips/${tripId}/boarding`, 'PATCH');
  }

  async completeTrip(tripId) {
    return await this.request(`/driver/trips/${tripId}/complete`, 'PATCH');
  }

  // S2 (Batch 12): decline an assigned trip — returns it to the
  // unassigned pool for the Operator to reassign. reason_code/reason_text
  // are both optional ("plain decline is enough").
  async declineDriverTrip(tripId, payload = {}) {
    return await this.request(`/driver/trips/${tripId}/decline`, 'PATCH', payload);
  }

  // Batch 15, Item 1: explicit Accept counterpart to declineDriverTrip().
  async acceptDriverTrip(tripId) {
    return await this.request(`/driver/trips/${tripId}/accept`, 'PATCH');
  }

  // Batch 15, Item 4: "Available" toggle — distinct from shift/pairing state.
  async updateDriverAvailability(available) {
    return await this.request('/driver/availability', 'PATCH', { available });
  }

  async getDriverPin() {
    return await this.request('/driver/pin', 'GET');
  }

  async verifyDriverPin(pin) {
    return await this.request('/driver/pin/verify', 'POST', { pin_code: pin });
  }

  async getDriverShiftStatus() {
    return await this.request('/driver/shift/status', 'GET');
  }

  async startDriverShift() {
    return await this.request('/driver/shift/start', 'POST');
  }

  async endDriverShift() {
    return await this.request('/driver/shift/end', 'POST');
  }

  async updateLocation(latitude, longitude, heading = null, speedKmh = null) {
    const payload = { latitude, longitude };
    if (Number.isFinite(heading)) payload.heading = heading;
    if (Number.isFinite(speedKmh)) payload.speed_kmh = speedKmh;
    return await this.request('/driver/location', 'POST', payload);
  }
}

export default new DriverService();
