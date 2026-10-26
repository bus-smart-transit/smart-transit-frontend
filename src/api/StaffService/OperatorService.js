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

  async regenerateRouteGeometry(routeId) {
    return await this.request(`/operator/routes/${routeId}/geometry/regenerate`, 'POST');
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

  // Batch 28: whether express trips stop at this route stop (default: terminals only).
  async setOperatorRouteStopExpress(routeId, routeStopId, served) {
    return await this.request(`/operator/routes/${routeId}/stops/${routeStopId}/express`, 'PATCH', { served_by_express: Boolean(served) });
  }

  async getOperatorFleetRoutes() {
    return await this.request('/operator/fleet-routes', 'GET');
  }

  // ── Trips ──
  async getOperatorTrips(statusFilter = 'all', options = {}) {
    return await this.request('/operator/trips', 'GET', { status_filter: statusFilter, ...options });
  }

  async scheduleTrip(tripData) {
    return await this.request('/operator/trips', 'POST', tripData);
  }

  async saveDispatchDecision(tripId, payload) {
    return await this.request(`/operator/trips/${tripId}/dispatch-decision`, 'PATCH', payload);
  }

  async getDispatchDecisionHistory(params = {}) {
    return await this.request('/operator/dispatch-decisions', 'GET', params);
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
  async getOperatorDrivers(params = {}) {
    return await this.request('/operator/drivers', 'GET', params);
  }

  async getOperatorConductors() {
    return await this.request('/operator/conductors', 'GET');
  }

  async createEmployeeAccount(accountData) {
    return await this.request('/operator/accounts', 'POST', accountData);
  }

  // ── Reporting ──
  // Batch 29, cash step 3: the remittance batch of each ended Chauffeur shift, and the Operator's confirmation.
  async getRemittances(params = {}) {
    return await this.request('/operator/remittances', 'GET', params);
  }

  // A flagged batch is closed out with a required explanation; the variance it was flagged for is kept.
  async resolveRemittance(id, payload = {}) {
    return await this.request(`/operator/remittances/${id}/resolve`, 'POST', payload);
  }

  async confirmRemittance(id, payload = {}) {
    return await this.request(`/operator/remittances/${id}/confirm`, 'POST', payload);
  }

  // Online payments that were charged but could not become tickets (a payment that arrived after its seats were
  // released), and the Operator's record that they refunded one in PayMongo (the note is the refund id). No money moves.
  async getUnfulfilledPayments(params = {}) {
    return await this.request('/operator/payments/needs-refund', 'GET', params);
  }

  async recordPaymentRefund(id, payload = {}) {
    return await this.request(`/operator/payments/${id}/refunded`, 'POST', payload);
  }

  async reconcileCheckoutNotCharged(id, payload = {}) {
    return await this.request(`/operator/payments/${id}/checkout-reconciled-not-paid`, 'POST', payload);
  }

  // Batch 29, Stage 2: the financial page (the server computes everything; nothing is derived here).
  async getFinancials(params = {}) {
    return await this.request('/operator/financials', 'GET', params);
  }

  async getFinancialTransactions(params = {}) {
    return await this.request('/operator/financials/transactions', 'GET', params);
  }

  async getDiscountTypes() {
    return await this.request('/operator/discount-types', 'GET');
  }

  async setDiscountTypeActive(key, active) {
    return await this.request(`/operator/discount-types/${encodeURIComponent(key)}/active`, 'PATCH', { active: Boolean(active) });
  }

  // The CSV text built by the server from the same query as the screen. Listing JSON first keeps a validation error JSON.
  async downloadFinancialExport(params = {}) {
    return await this.request('/operator/financials/export', 'GET', params, { Accept: 'application/json, text/csv' });
  }

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
  // Batch 28: one card per shift block, with the driver's and the Chauffeur's assignment state.
  async getAssignmentBlocks() {
    return await this.request('/operator/assignments', 'GET');
  }

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
  // The backend requires step-up for this call: pass the token from StepUpModal
  // (password confirmation), sent as the X-Step-Up-Token header.
  // Batch 28 Stage 3, item 6: cancel a trip and settle the tickets of a cancelled trip for the passenger (rebook, refund,
  // cash entry, reviewed amount). The server works out every amount and records who acted.
  async cancelTrip(tripId, reason = '') {
    return await this.request(`/operator/trips/${tripId}/cancel`, 'PATCH', reason ? { reason } : {});
  }

  async getTicketResolutions() {
    return await this.request('/operator/ticket-resolutions', 'GET');
  }

  async getStaffTicketResolution(ticketUuid) {
    return await this.request(`/operator/tickets/${ticketUuid}/resolution`, 'GET');
  }

  async chooseStaffTicketResolution(ticketUuid, body) {
    return await this.request(`/operator/tickets/${ticketUuid}/resolution`, 'POST', body);
  }

  async recordCashRefund(resolutionId, note = '') {
    return await this.request(`/operator/ticket-resolutions/${resolutionId}/cash`, 'POST', note ? { note } : {});
  }

  async reviewRefund(resolutionId, amount, note) {
    return await this.request(`/operator/ticket-resolutions/${resolutionId}/review`, 'POST', { amount, note });
  }

  // Read-only completed-trip duration report; factors are applied automatically by the backend.
  async getDurationReport(routeId = null) {
    return await this.request('/operator/duration-report', 'GET', routeId ? { route_id: routeId } : {});
  }
  async planShiftBlockLegs(params) {
    return await this.request('/operator/shift-blocks/plan-legs', 'GET', params);
  }

  async getFareRules(filters = {}) {
    return await this.request('/operator/fare-rules', 'GET', filters);
  }

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

  // §4.8: the crew's time in / time out (Start Shift / End Shift) on one Manila date, read only.
  async getCrewShifts(date) {
    return await this.request('/operator/crew-shifts', 'GET', date ? { date } : {});
  }

  // Phase B (§4.13): the same block on every day From..To. Preview saves nothing; create makes the clean days.
  async previewShiftBlockRange(payload) {
    return await this.request('/operator/shift-blocks/range/preview', 'POST', payload);
  }

  async createShiftBlockRange(payload) {
    return await this.request('/operator/shift-blocks/range', 'POST', payload);
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
