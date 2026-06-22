import BaseService from "../BaseService";

class PassengerService extends BaseService {
  /**
   * Register a new passenger account.
   * @param {object} payload
   */
  async register(payload) {
    return await this.request("/register", "POST", payload);
  }

  /**
   * Log in with email and password.
   * @param {object} credentials
   */
  async login(credentials) {
    return await this.request("/login", "POST", credentials);
  }

  /**
   * Log out (cleans local state tokens).
   */
  async logout() {
    try {
      return await this.request("/logout", "DELETE");
    } finally {
      localStorage.removeItem("passenger_token");
      sessionStorage.removeItem("passenger_token");
    }
  }

  /**
   * Get the currently authenticated passenger's profile.
   */
  async getProfile() {
    return await this.request("/passengers/profile", "GET");
  }

  /**
   * Update passenger profile data configurations.
   * @param {object} updates
   */
  async updateProfile(updates) {
    return await this.request("/passengers/profile", "PUT", updates);
  }

  /**
   * Request a backend password reset distribution link.
   * @param {object} payload
   */
  async requestPasswordReset(payload) {
    return await this.request("/passengers/password-reset", "POST", payload);
  }
}

// Export a single initialized instance of the service class
export default new PassengerService();
