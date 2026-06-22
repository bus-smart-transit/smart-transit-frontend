import BaseService from "../BaseService";

class AuthService extends BaseService {
  async login(credentials) {
    return await this.request("/login", "POST", credentials);
  }

  async register(payload) {
    return await this.request("/register", "POST", payload);
  }
}

export default new AuthService();
