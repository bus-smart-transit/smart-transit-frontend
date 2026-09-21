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
