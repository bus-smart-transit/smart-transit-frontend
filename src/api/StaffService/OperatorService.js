import { StaffBaseService } from './StaffBaseService';
import { TokenManager } from '../../utils/TokenManager.js';

/**
 * Operator-only endpoints. See StaffBaseService.js for the ISP rationale.
 */
class OperatorService extends StaffBaseService {
  async logoutOperator() {
    try {
      return await this.request('/operator/logout', 'DELETE');
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  // ── Fleets ──
  async getOperatorFleets() {
    return await this.request('/operator/fleets', 'GET');
  }

  async getFleetLocations() {
    return await this.request('/fleet/locations', 'GET');
  }

  async createFleet(fleetData) {
    return await this.request('/operator/fleets', 'POST', fleetData);
  }

  // ── Routes ──
  async getOperatorRoutes() {
    return await this.request('/operator/routes', 'GET');
  }

  async createOperatorRoute(routeData) {
    return await this.request('/operator/routes', 'POST', routeData);
  }

  async getOperatorRoute(routeId) {
    return await this.request(`/operator/routes/${routeId}`, 'GET');
  }

  // ── Stops ──
  async getOperatorStops() {
    return await this.request('/operator/stops', 'GET');
  }

  async createOperatorStop(stopData) {
    return await this.request('/operator/stops', 'POST', stopData);
  }

  async updateOperatorStop(stopId, stopData) {
    return await this.request(`/operator/stops/${stopId}`, 'PUT', stopData);
  }

  async deleteOperatorStop(stopId) {
    return await this.request(`/operator/stops/${stopId}`, 'DELETE');
  }

  async addOperatorStopToRoute(routeId, stopData) {
    return await this.request(`/operator/routes/${routeId}/stops`, 'POST', stopData);
  }

  async removeOperatorStopFromRoute(routeId, routeStopId) {
    return await this.request(`/operator/routes/${routeId}/stops/${routeStopId}`, 'DELETE');
  }

  // D5: per-route switch for passenger custom drop-offs (off by default).
  async setOperatorRouteCustomDropoff(routeId, allow) {
    return await this.request(`/operator/routes/${routeId}/custom-dropoff`, 'PATCH', { allow_custom_dropoff: Boolean(allow) });
  }

  async getOperatorFleetRoutes() {
    return await this.request('/operator/fleet-routes', 'GET');
  }

  // ── Trips ──
  async getOperatorTrips(statusFilter = 'all') {
    return await this.request('/operator/trips', 'GET', { status_filter: statusFilter });
  }

  async scheduleTrip(tripData) {
    return await this.request('/operator/trips', 'POST', tripData);
  }

  async saveDispatchDecision(tripId, payload) {
    return await this.request(`/operator/trips/${tripId}/dispatch-decision`, 'PATCH', payload);
  }

  async getOperatorTripGpsHistory(tripId, params = {}) {
    return await this.request(`/operator/trips/${tripId}/gps-history`, 'GET', params);
  }

  async assignDriver(tripId, driverId) {
    return await this.request(`/operator/trips/${tripId}/driver`, 'PATCH', { driver_id: driverId });
  }

  async assignConductor(tripId, conductorId) {
    return await this.request(`/operator/trips/${tripId}/conductor`, 'PATCH', { conductor_id: conductorId });
  }

  async startBoarding(tripId) {
    return await this.request(`/operator/trips/${tripId}/boarding`, 'PATCH');
  }

  async operatorDepartTrip(tripId) {
    return await this.request(`/operator/trips/${tripId}/depart`, 'PATCH');
  }

  async operatorCompleteTrip(tripId) {
    return await this.request(`/operator/trips/${tripId}/complete`, 'PATCH');
  }

  // Manual status override — operators may only mark an already-departed
  // trip as 'completed' (server-enforced); admins can override any status.
  async overrideTripStatus(tripId, status) {
    return await this.request(`/operator/trips/${tripId}/status`, 'PATCH', { status });
  }

  // ── Staff directory ──
  async getOperatorDrivers() {
    return await this.request('/operator/drivers', 'GET');
  }

  async getOperatorConductors() {
    return await this.request('/operator/conductors', 'GET');
  }

  async createEmployeeAccount(accountData) {
    return await this.request('/operator/accounts', 'POST', accountData);
  }

  // ── Reporting ──
  async getFinancialReport(fleetId, params = {}) {
    return await this.request(`/operator/fleets/${fleetId}/reports/financial`, 'GET', params);
  }

  async getRevenueByRoute(fleetId, params = {}) {
    return await this.request(`/operator/fleets/${fleetId}/reports/revenue-by-route`, 'GET', params);
  }

  async getRouteAdherence(fleetId, params = {}) {
    return await this.request(`/operator/fleets/${fleetId}/reports/route-adherence`, 'GET', params);
  }

  async getOccupancyTrends(fleetId, params = {}) {
    return await this.request(`/operator/fleets/${fleetId}/reports/occupancy-trends`, 'GET', params);
  }

  async getDailySummary(fleetId, params = {}) {
    return await this.request(`/operator/fleets/${fleetId}/reports/daily-summary`, 'GET', params);
  }

  async getPaymentChannels(fleetId, params = {}) {
    return await this.request(`/operator/fleets/${fleetId}/reports/payment-channels`, 'GET', params);
  }

  // ── Notifications (Batch 12: trip declines feed) ──
  async getNotifications() {
    return await this.request('/operator/notifications', 'GET');
  }

  async markNotificationRead(id) {
    return await this.request(`/operator/notifications/${id}/read`, 'PATCH');
  }

  async markAllNotificationsRead() {
    return await this.request('/operator/notifications/read-all', 'PATCH');
  }

  // ── Assignment decline requests (Batch 24, C6) ──
  async getTripRequests() {
    return await this.request('/operator/trip-requests', 'GET');
  }

  async approveTripRequest(id) {
    return await this.request(`/operator/trip-requests/${id}/approve`, 'PATCH');
  }

  async rejectTripRequest(id) {
    return await this.request(`/operator/trip-requests/${id}/reject`, 'PATCH');
  }

  // ── Fleet Route Assignment ──
  async assignRouteToFleet(fleetId, routeData) {
    return await this.request(`/operator/fleets/${fleetId}/routes`, 'POST', routeData);
  }

  // ── Fare Rules ──
  // The backend requires step-up for this call. The optional token is kept for the future
  // step-up flow (see StepUpModal); the portal does not send one yet.
  async createFareRule(fareData, stepUpToken = null) {
    const extraHeaders = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {};
    return await this.request(`/operator/fare-rules`, 'POST', fareData, extraHeaders);
  }

  // ── Batch 18: Shift Block Hand-off System ──
  async getShiftBlocks(statusFilter = null) {
    return await this.request('/operator/shift-blocks', 'GET', statusFilter ? { status_filter: statusFilter } : {});
  }

  async getShiftBlock(shiftBlockId) {
    return await this.request(`/operator/shift-blocks/${shiftBlockId}`, 'GET');
  }

  async createShiftBlock(payload) {
    return await this.request('/operator/shift-blocks', 'POST', payload);
  }

  async updateShiftBlockAssignment(shiftBlockId, payload) {
    return await this.request(`/operator/shift-blocks/${shiftBlockId}`, 'PATCH', payload);
  }

  async cancelShiftBlock(shiftBlockId) {
    return await this.request(`/operator/shift-blocks/${shiftBlockId}/cancel`, 'PATCH');
  }

  async getPendingReviewShiftBlocks() {
    return await this.request('/operator/shift-blocks/pending-review', 'GET');
  }

  async markShiftBlockReviewed(shiftBlockId) {
    return await this.request(`/operator/shift-blocks/${shiftBlockId}/mark-reviewed`, 'PATCH');
  }

  async overrideShiftBlockHandoff(shiftBlockId) {
    return await this.request(`/operator/shift-blocks/${shiftBlockId}/override-handoff`, 'POST');
  }

  async overrideShiftBlockTakeover(shiftBlockId) {
    return await this.request(`/operator/shift-blocks/${shiftBlockId}/override-takeover`, 'POST');
  }
}

export default new OperatorService();
