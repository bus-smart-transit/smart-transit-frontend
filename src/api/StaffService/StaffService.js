import { BaseService } from '../BaseService';
import { TokenManager } from '../../utils/TokenManager.js';

const TOKEN_KEY = 'staff_token';

class StaffService extends BaseService {
  constructor() {
    super(TOKEN_KEY);
  }

  getResponseStatus(err) {
    return err?.cause?.response?.status ?? err?.response?.status ?? null;
  }

  // ── Auth ──
  async login(credentials) {
    return await this.request('/staff/login', 'POST', credentials);
  }

  async verifyOtp(userId, otp) {
    return await this.request('/staff/verify-otp', 'POST', {
      user_id: userId,
      otp,
    });
  }

  async setTwoFactorPreference(enabled, role = null) {
    const payload = { enabled };
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    const hasRoleEndpoint = ['operator', 'driver', 'conductor', 'admin'].includes(normalizedRole);

    if (hasRoleEndpoint) {
      try {
        return await this.request(`/${normalizedRole}/2fa-preference`, 'PATCH', payload);
      } catch (err) {
        if (this.getResponseStatus(err) !== 404) throw err;
      }
    }

    return await this.request('/staff/2fa-preference', 'PATCH', payload);
  }

  // Step-up re-authentication
  async stepUpInitiate() {
    return await this.request('/step-up/initiate', 'POST');
  }

  async stepUpVerify(otp) {
    return await this.request('/step-up/verify', 'POST', { otp });
  }

  async logout(role = null) {
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
    const roleScoped = ['driver', 'conductor', 'operator', 'admin'].includes(normalizedRole);
    const endpoint = roleScoped ? `/${normalizedRole}/logout` : '/staff/logout';

    try {
      return await this.request(endpoint, 'DELETE');
    } catch (err) {
      if (roleScoped && this.getResponseStatus(err) === 404) {
        return await this.request('/staff/logout', 'DELETE');
      }
      throw err;
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  async logoutDriver() {
    try {
      return await this.request('/driver/logout', 'DELETE');
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  async logoutConductor() {
    try {
      return await this.request('/conductor/logout', 'DELETE');
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  async logoutOperator() {
    try {
      return await this.request('/operator/logout', 'DELETE');
    } finally {
      TokenManager.clearStaffSession();
    }
  }

  async forgotPassword(payload) {
    return await this.request('/staff/forgot-password', 'POST', payload);
  }

  async resetPassword(payload) {
    return await this.request('/staff/reset-password', 'POST', payload);
  }

  async getProfile(role) {
    return await this.request(`/${role}/profile`, 'GET');
  }

  // ── Driver ──
  async getDriverTrips() {
    return await this.request('/driver/trips', 'GET');
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

  // ── Driver/Conductor Pairing ──
  async getPairingToken(role) {
    return await this.request(`/${role}/pairing-token`, 'GET');
  }

  async submitPairing(role, credential, mode = 'token') {
    const payload = mode === 'pin'
      ? { pin_code: credential }
      : { token: credential };

    return await this.request(`/${role}/pair`, 'POST', payload);
  }

  async getPairingStatus(role) {
    return await this.request(`/${role}/pairing-status`, 'GET');
  }

  async updateLocation(latitude, longitude, heading = null, speedKmh = null) {
    const payload = { latitude, longitude };
    if (Number.isFinite(heading)) payload.heading = heading;
    if (Number.isFinite(speedKmh)) payload.speed_kmh = speedKmh;
    return await this.request('/driver/location', 'POST', payload);
  }

  // ── Conductor ──
  async getConductorTrip() {
    try {
      return await this.request('/conductor/trips/current', 'GET');
    } catch (err) {
      if (this.getResponseStatus(err) === 404) return { data: null };
      throw err;
    }
  }

  async getConductorTrips() {
    return await this.request('/conductor/trips', 'GET');
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

  async getConductorPin() {
    return await this.request('/conductor/pin', 'GET');
  }

  async verifyConductorPin(pin) {
    return await this.request('/conductor/pin/verify', 'POST', { pin_code: pin });
  }

  async checkoutOnsite(payload) {
    return await this.request('/conductor/checkout', 'POST', payload);
  }

  // ── Operator ──
  async getOperatorFleets() {
    return await this.request('/operator/fleets', 'GET');
  }

  async getFleetLocations() {
    return await this.request('/fleet/locations', 'GET');
  }

  async getOperatorRoutes() {
    return await this.request('/operator/routes', 'GET');
  }

  async createOperatorRoute(routeData) {
    return await this.request('/operator/routes', 'POST', routeData);
  }

  async getOperatorRoute(routeId) {
    return await this.request(`/operator/routes/${routeId}`, 'GET');
  }

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

  async getOperatorTrips() {
    return await this.request('/operator/trips', 'GET');
  }

  async getOperatorDrivers() {
    return await this.request('/operator/drivers', 'GET');
  }

  async getOperatorConductors() {
    return await this.request('/operator/conductors', 'GET');
  }

  async createFleet(fleetData) {
    return await this.request('/operator/fleets', 'POST', fleetData);
  }

  async createEmployeeAccount(accountData) {
    return await this.request('/operator/accounts', 'POST', accountData);
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

  async getAvailableTrips() {
    return await this.request('/trips', 'GET');
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

  // ── Trip Management ──
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

  // ── Fleet Route Assignment ──
  async assignRouteToFleet(fleetId, routeData) {
    return await this.request(`/operator/fleets/${fleetId}/routes`, 'POST', routeData);
  }

  // ── Fare Rules ──
  async createFareRule(fareData, stepUpToken = null) {
    const extraHeaders = stepUpToken ? { 'X-Step-Up-Token': stepUpToken } : {};
    return await this.request(`/operator/fare-rules`, 'POST', fareData, extraHeaders);
  }

  // ── Admin: Stop Management ──
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

  // ── Admin: Route Management ──
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

  // ── Admin: Fleet Management ──
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

  // ── Admin: Account Management ──
  async createAdminAccount(accountData) {
    return await this.request(`/admin/accounts`, 'POST', accountData);
  }

  async getAdminDrivers() {
    return await this.request(`/admin/drivers`, 'GET');
  }

  async getAdminConductors() {
    return await this.request(`/admin/conductors`, 'GET');
  }

  // ── Earnings ──
  async getTripEarnings(role) {
    // role = 'driver' | 'conductor'
    try {
      return await this.request(`/${role}/trips/current/earnings`, 'GET');
    } catch (err) {
      const status = this.getResponseStatus(err);
      if (status === 404 || status === 500) {
        return { data: null };
      }
      throw err;
    }
  }

  // ── Public: Route Stops (for navigation map) ──
  async getRouteStops(routeId) {
    return await this.request(`/routes/${routeId}/stops`, 'GET');
  }
}

export const staffToken = TOKEN_KEY;
export default new StaffService();
