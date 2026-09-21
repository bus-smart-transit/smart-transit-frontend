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

  // ── Fleet Route Assignment ──
  async assignRouteToFleet(fleetId, routeData) {
    return await this.request(`/operator/fleets/${fleetId}/routes`, 'POST', routeData);
  }

  // ── Fare Rules ──
  async createFareRule(fareData, stepUpToken = null) {
    const extraHeaders = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {};
    return await this.request(`/operator/fare-rules`, 'POST', fareData, extraHeaders);
  }
}

export default new OperatorService();
