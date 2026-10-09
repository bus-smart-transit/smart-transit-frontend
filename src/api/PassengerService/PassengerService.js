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

  // Replaces the ticket's tracking link: the old link stops working at once, the new token is returned.
  async renewTrackingLink(ticketUuid) {
    return await this.request(`/${this.endpointBase}/tickets/${ticketUuid}/tracking-link`, "POST");
  }

  // Batch 28 Stage 3, item 6: rebook or refund a ticket of a trip the OPERATOR cancelled (the server decides every amount).
  async getTicketResolution(ticketUuid) {
    return await this.request(`/${this.endpointBase}/tickets/${ticketUuid}/resolution`, "GET");
  }

  async chooseTicketResolution(ticketUuid, body) {
    return await this.request(`/${this.endpointBase}/tickets/${ticketUuid}/resolution`, "POST", body);
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

  async verifyOtp(userId, otp) {
    return await this.request(`/${this.endpointBase}/verify-otp`, "POST", {
      user_id: userId,
      otp,
    });
  }

  async setTwoFactorPreference(enabled) {
    return await this.request(`/${this.endpointBase}/two-factor`, "PATCH", { enabled });
  }

  // Notifications audit follow-up: passenger-side FCM registration, so
  // trip cancellation / payment failure pushes can reach the passenger.
  async registerFcmToken(token) {
    return await this.request(`/${this.endpointBase}/fcm-token`, "POST", { token });
  }
}

export default new PassengerService();
