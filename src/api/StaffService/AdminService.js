import { StaffBaseService } from './StaffBaseService';

/**
 * Admin-only endpoints. See StaffBaseService.js for the ISP rationale.
 * Admin shares the generic StaffBaseService::logout()/getProfile('admin')
 * for auth — no admin-specific overrides needed there.
 */
class AdminService extends StaffBaseService {
  // ── Stop Management ──
  async getStops() {
    return await this.request(`/admin/stops`, 'GET');
  }

  async createStop(stopData) {
    return await this.request(`/admin/stops`, 'POST', stopData);
  }

  async updateStop(stopId, stopData) {
    return await this.request(`/admin/stops/${stopId}`, 'PUT', stopData);
  }

  async deleteStop(stopId) {
    return await this.request(`/admin/stops/${stopId}`, 'DELETE');
  }

  // ── Route Management ──
  async getRoutes() {
    return await this.request(`/admin/routes`, 'GET');
  }

  async createRoute(routeData) {
    return await this.request(`/admin/routes`, 'POST', routeData);
  }

  async updateRoute(routeId, routeData) {
    return await this.request(`/admin/routes/${routeId}`, 'PUT', routeData);
  }

  async deleteRoute(routeId) {
    return await this.request(`/admin/routes/${routeId}`, 'DELETE');
  }

  async setRouteCustomDropoff(routeId, allow) {
    return await this.request(`/admin/routes/${routeId}/custom-dropoff`, 'PATCH', { allow_custom_dropoff: Boolean(allow) });
  }

  async addStopToRoute(routeId, stopData) {
    return await this.request(`/admin/routes/${routeId}/stops`, 'POST', stopData);
  }

  async removeStopFromRoute(routeId, routeStopId) {
    return await this.request(`/admin/routes/${routeId}/stops/${routeStopId}`, 'DELETE');
  }

  // ── Fleet Management ──
  async getAdminFleets() {
    return await this.request(`/admin/fleets`, 'GET');
  }

  async getFleetDetail(fleetId) {
    return await this.request(`/admin/fleets/${fleetId}`, 'GET');
  }

  async updateFleet(fleetId, fleetData) {
    return await this.request(`/admin/fleets/${fleetId}`, 'PUT', fleetData);
  }

  async deleteFleet(fleetId) {
    return await this.request(`/admin/fleets/${fleetId}`, 'DELETE');
  }

  async adminCreateFleet(fleetData) {
    return await this.request(`/admin/fleets`, 'POST', fleetData);
  }

  // ── Account Management ──
  // Batch 28 Stage 3, item 6: cancel a trip and settle the tickets of a cancelled trip for the passenger (rebook, refund,
  // cash entry, reviewed amount). The server works out every amount and records who acted.
  async cancelTrip(tripId, reason = '') {
    return await this.request(`/admin/trips/${tripId}/cancel`, 'PATCH', reason ? { reason } : {});
  }

  async getTicketResolutions() {
    return await this.request('/admin/ticket-resolutions', 'GET');
  }

  async getStaffTicketResolution(ticketUuid) {
    return await this.request(`/admin/tickets/${ticketUuid}/resolution`, 'GET');
  }

  async chooseStaffTicketResolution(ticketUuid, body) {
    return await this.request(`/admin/tickets/${ticketUuid}/resolution`, 'POST', body);
  }

  async recordCashRefund(resolutionId, note = '') {
    return await this.request(`/admin/ticket-resolutions/${resolutionId}/cash`, 'POST', note ? { note } : {});
  }

  async reviewRefund(resolutionId, amount, note) {
    return await this.request(`/admin/ticket-resolutions/${resolutionId}/review`, 'POST', { amount, note });
  }

  // Batch 28 Stage 3, item 10: designated drop-off points, restricted areas and the route's drop-off mode.
  async getDropoffPoints(params = {}) {
    return await this.request('/admin/dropoff/points', 'GET', params);
  }

  async saveDropoffPoint(payload, id = null) {
    return id
      ? await this.request(`/admin/dropoff/points/${id}`, 'PUT', payload)
      : await this.request('/admin/dropoff/points', 'POST', payload);
  }

  async getDropoffRestrictions(routeId = null) {
    return await this.request('/admin/dropoff/restrictions', 'GET', routeId ? { route_id: routeId } : {});
  }

  async saveDropoffRestriction(payload, id = null) {
    return id
      ? await this.request(`/admin/dropoff/restrictions/${id}`, 'PUT', payload)
      : await this.request('/admin/dropoff/restrictions', 'POST', payload);
  }

  async reviewDropoffRestriction(id) {
    return await this.request(`/admin/dropoff/restrictions/${id}/review`, 'POST', {});
  }

  async setRouteDropoffMode(routeId, mode) {
    return await this.request(`/admin/routes/${routeId}/custom-dropoff`, 'PATCH', { custom_dropoff_mode: mode });
  }

  // The stops of a route, in order (public endpoint), for choosing the two ends of a restricted area.
  async getRouteStopsForDropoff(routeId) {
    return await this.request(`/routes/${routeId}/stops`, 'GET');
  }
  // Batch 28 Stage 3, item 7: peak-hour duration windows ("configured", never measured), the read-only report and the leg-time suggestion.
  async getDurationFactors(routeId = null) {
    return await this.request('/admin/duration-factors', 'GET', routeId ? { route_id: routeId } : {});
  }

  async saveDurationFactor(payload, id = null) {
    return id
      ? await this.request(`/admin/duration-factors/${id}`, 'PUT', payload)
      : await this.request('/admin/duration-factors', 'POST', payload);
  }

  async deleteDurationFactor(id) {
    return await this.request(`/admin/duration-factors/${id}`, 'DELETE');
  }

  async getDurationReport(routeId = null) {
    return await this.request('/admin/duration-report', 'GET', routeId ? { route_id: routeId } : {});
  }
  async getFareRules(filters = {}) {
    return await this.request(`/admin/fare-rules`, 'GET', filters);
  }

  async createFareRule(fareData, stepUpToken = null) {
    const extraHeaders = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {};
    return await this.request(`/admin/fare-rules`, 'POST', fareData, extraHeaders);
  }

  async createAdminAccount(accountData) {
    return await this.request(`/admin/accounts`, 'POST', accountData);
  }

  async getAdminDrivers() {
    return await this.request(`/admin/drivers`, 'GET');
  }

  async getAdminConductors() {
    return await this.request(`/admin/conductors`, 'GET');
  }
}

export default new AdminService();
