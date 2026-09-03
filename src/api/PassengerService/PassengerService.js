import RoleAuthServiceBase from "../RoleAuthServiceBase";

class PassengerService extends RoleAuthServiceBase {
  constructor() {
    super("passenger"); // → token key "passenger_token", endpoint base "/passengers"
  }

  async updateProfile(updates) {
    return await this.request(`/${this.endpointBase}/profile`, "PUT", updates);
  }

  async requestPasswordReset(payload) {
    return await this.request(
      `/${this.endpointBase}/forgot-password`,
      "POST",
      payload,
    );
  }

  async forgotPassword(payload) {
    return await this.request(`/${this.endpointBase}/forgot-password`, "POST", payload);
  }

  async resetPassword(payload) {
    return await this.request(`/${this.endpointBase}/reset-password`, "POST", payload);
  }

  async getTickets() {
    return await this.request(`/${this.endpointBase}/tickets`, "GET");
  }

  async getPaymentHistory() {
    return await this.request(`/${this.endpointBase}/payments`, "GET");
  }

  async getTicketQR(ticketUuid) {
    return await this.request(`/${this.endpointBase}/tickets/${ticketUuid}/qr`, "GET");
  }

  async getRewardsHistory() {
    return await this.request(`/${this.endpointBase}/rewards/history`, "GET");
  }

  async getDashboardSummary() {
    return await this.request(`/${this.endpointBase}/dashboard-summary`, "GET");
  }

  async getAvailableTrips(options = {}) {
    return await this.request(`/trips`, "GET", options);
  }

  async checkoutOnline(payload) {
    const hasToken = !!(localStorage.getItem('passenger_token') || sessionStorage.getItem('passenger_token'));
    const endpoint = hasToken ? `/${this.endpointBase}/checkout` : '/checkout';
    return await this.request(endpoint, "POST", payload);
  }

  // ── Public Quote Endpoints (no auth required) ──
  async quoteFare(payload) {
    return await this.request(`/fare/quote`, "POST", payload);
  }

  async quoteFleetsByLocation(payload) {
    return await this.request(`/fare/quote-fleets-by-location`, "POST", payload);
  }

  async getFleetLocations() {
    return await this.request(`/fleet/locations`, "GET");
  }

  async getNearestFleet(payload) {
    return await this.request(`/fleet/nearest`, "GET", payload);
  }

  async getRouteFares(routeId) {
    return await this.request(`/routes/${routeId}/fares`, "GET");
  }

  async guestLookupTicket(payload) {
    return await this.request(`/tickets/lookup`, "GET", payload);
  }

  async getRouteStops(routeId) {
    return await this.request(`/routes/${routeId}/stops`, "GET");
  }

  async verifyOtp(userId, otp) {
    return await this.request(`/${this.endpointBase}/verify-otp`, "POST", {
      user_id: userId,
      otp,
    });
  }

  async setTwoFactorPreference(enabled) {
    return await this.request(`/${this.endpointBase}/two-factor`, "PATCH", { enabled });
  }
}

export default new PassengerService();
