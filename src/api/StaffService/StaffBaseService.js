import { BaseService } from '../BaseService';
import { TokenManager } from '../../utils/TokenManager.js';

const TOKEN_KEY = 'staff_token';

/**
 * Shared behavior for all staff roles (driver/conductor/operator/admin) —
 * auth, step-up re-auth, pairing, profile, FCM registration, trip earnings
 * (parameterized by role), and public route-stop lookup.
 *
 * Architecture audit follow-up (CONF-04 / ISP): StaffService.js previously
 * exposed ~80+ methods across all 4 roles in one monolithic ~540-line class
 * — any component importing it could reach every other role's methods
 * regardless of what it actually needed. Split into this shared base class
 * plus one focused subclass per role (DriverService/ConductorService/
 * OperatorService/AdminService); each dashboard now imports only its own
 * role's service.
 *
 * All staff roles share one Sanctum token (only one staff member is logged
 * in per browser session, regardless of role), so every subclass uses the
 * same TOKEN_KEY.
 */
export class StaffBaseService extends BaseService {
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

  async forgotPassword(payload) {
    return await this.request('/staff/forgot-password', 'POST', payload);
  }

  async resetPassword(payload) {
    return await this.request('/staff/reset-password', 'POST', payload);
  }

  async getProfile(role) {
    return await this.request(`/${role}/profile`, 'GET');
  }

  // ── Driver/Conductor Pairing (shared, parameterized by role) ──
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

  // Batch 15, Items 2/3: register this user's FCM device token (shared
  // endpoint across all staff roles).
  async registerFcmToken(token) {
    return await this.request('/staff/fcm-token', 'POST', { token });
  }

  // ── Earnings (shared, parameterized by role) ──
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

// Ready-to-use singleton for consumers that only need shared/auth behavior
// and have no single role of their own (login/forgot-password/reset-password
// pages, the step-up modal, the pairing screen, and the staff auth guard).
export default new StaffBaseService();
