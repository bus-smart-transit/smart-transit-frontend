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
      `/${this.endpointBase}/password-reset`,
      "POST",
      payload,
    );
  }

  async getTickets() {
    return await this.request(`/${this.endpointBase}/tickets`, "GET");
  }

  async getTicketQR(ticketId) {
    return await this.request(`/${this.endpointBase}/tickets/${ticketId}/qr`, "GET");
  }

  async getRewardsHistory() {
    return await this.request(`/${this.endpointBase}/rewards/history`, "GET");
  }
}

export default new PassengerService();
