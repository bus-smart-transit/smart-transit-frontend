import BaseService from "./BaseService";

/**
 * Generic auth behavior shared by every role (passenger, employee, admin...).
 * Concrete services extend this and add role-specific extras.
 *
 * @param {string} role - singular role name, used for the token key, e.g. "passenger"
 * @param {string} [endpointBase] - URL path segment for this role's endpoints.
 *   Defaults to `${role}s` (simple pluralization). Override for roles that
 *   don't pluralize the same way (e.g. "admin", not "admins").
 */
export default class RoleAuthServiceBase extends BaseService {
  constructor(role, endpointBase = `${role}s`) {
    super(`${role}_token`);
    this.role = role;
    this.endpointBase = endpointBase;
  }

  // 2026-10-30: one sign-in address for every account; `portal` says which page (passenger or staff) is used.
  async login(credentials) {
    return await this.request("/auth/login", "POST", { ...credentials, portal: this.role });
  }

  async register(payload) {
    return await this.request(
      `/${this.endpointBase}/register`,
      "POST",
      payload,
    );
  }

  async logout() {
    try {
      return await this.request(`/${this.endpointBase}/logout`, "DELETE");
    } finally {
      localStorage.removeItem(this.tokenKey);
      sessionStorage.removeItem(this.tokenKey);
    }
  }

  async getProfile() {
    return await this.request(`/${this.endpointBase}/profile`, "GET");
  }
}
