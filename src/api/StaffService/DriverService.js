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

  // Batch 28: a shift block (or one standalone trip) is ONE card; accept or decline it once.
  // The leg-level declineDriverTrip/acceptDriverTrip calls were removed in Batch 27 Part 2: nothing used them.
  async getAssignments() {
    return await this.request('/driver/assignments', 'GET');
  }

  async acceptAssignment(key) {
    return await this.request(`/driver/assignments/${key}/accept`, 'PATCH');
  }

  async declineAssignment(key, payload = {}) {
    return await this.request(`/driver/assignments/${key}/decline`, 'PATCH', payload);
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

  // Batch 27 Part 2: ends a shift block's shift (every leg completed or cancelled). The server refuses otherwise.
  async endDriverShift() {
    return await this.request('/driver/shift/end', 'POST');
  }

  async updateLocation(latitude, longitude, heading = null, speedKmh = null, accuracy = null) {
    const payload = { latitude, longitude };
    if (Number.isFinite(heading)) payload.heading = heading;
    if (Number.isFinite(speedKmh)) payload.speed_kmh = speedKmh;
    if (Number.isFinite(accuracy)) payload.accuracy = accuracy;
    return await this.request('/driver/location', 'POST', payload);
  }

  // Batch 18: Shift Block Hand-off System.
  async getMyShiftBlocks() {
    return await this.request('/driver/shift-blocks', 'GET');
  }

  async confirmShiftBlockTakeover(shiftBlockId) {
    return await this.request(`/driver/shift-blocks/${shiftBlockId}/confirm-takeover`, 'POST');
  }
}

export default new DriverService();
