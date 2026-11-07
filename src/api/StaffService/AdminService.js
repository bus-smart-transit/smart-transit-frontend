import { StaffBaseService } from './StaffBaseService';

/**
 * Admin-only endpoints. See StaffBaseService.js for the ISP rationale.
 * Admin shares the generic StaffBaseService::logout()/getProfile('admin')
 * for auth — no admin-specific overrides needed there.
 */
class AdminService extends StaffBaseService {
  // Batch 48 Phase 2: the Super Admin Dashboard counts.
  async getOverview() {
    return await this.request('/admin/overview', 'GET');
  }

  // Batch 48 Phase 6: System health (read only).
  async getHealth() {
    return await this.request('/admin/health', 'GET');
  }

  // Batch 49 item 4: the GPS simulator ("Take control of GPS location") for departed trips.
  async getGpsSimulations() {
    return await this.request('/admin/gps-simulations', 'GET');
  }

  async startGpsSimulation(tripId, speed) {
    return await this.request('/admin/gps-simulations', 'POST', { trip_id: tripId, speed });
  }

  async controlGpsSimulation(simulationId, body) {
    return await this.request(`/admin/gps-simulations/${simulationId}`, 'PATCH', body);
  }

  // Batch 48 Phase 3: companies and every account.
  async getCompanies() {
    return await this.request('/admin/companies', 'GET');
  }

  async createCompany(companyName) {
    return await this.request('/admin/companies', 'POST', { company_name: companyName });
  }

  async renameCompany(companyId, companyName) {
    return await this.request(`/admin/companies/${companyId}`, 'PATCH', { company_name: companyName });
  }

  async addCompanyAdmin(companyId, payload) {
    return await this.request(`/admin/companies/${companyId}/company-admins`, 'POST', payload);
  }

  async getUsers(params = {}) {
    return await this.request('/admin/users', 'GET', params);
  }

  async deactivateUser(userId) {
    return await this.request(`/admin/users/${userId}/deactivate`, 'PATCH');
  }

  async reactivateUser(userId) {
    return await this.request(`/admin/users/${userId}/reactivate`, 'PATCH');
  }

  // Batch 48 Phase 5: money across every company (read only) and payments to refund by hand.
  async getFinancials(params = {}) {
    return await this.request('/admin/financials', 'GET', params);
  }

  async getNeedsRefund(params = {}) {
    return await this.request('/admin/payments/needs-refund', 'GET', params);
  }

  // Batch 48 Phase 4: the Audit log page.
  async getAuditLog(params = {}) {
    return await this.request('/admin/audit-log', 'GET', params);
  }

  async setCompanyAdmin(userId, isCompanyAdmin) {
    return await this.request(`/admin/users/${userId}/company-admin`, 'PATCH', { is_company_admin: isCompanyAdmin });
  }
}

export default new AdminService();
