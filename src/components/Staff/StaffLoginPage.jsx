import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import StaffService from '../../api/StaffService/StaffService';
import './StaffLogin.css';

const ROLES = [
  { value: 'driver',    label: 'Driver',    icon: '🚌', desc: 'Manage trips & navigation' },
  { value: 'conductor', label: 'Conductor', icon: '🎫', desc: 'Ticket scanning & occupancy' },
  { value: 'operator',  label: 'Operator',  icon: '⚙️',  desc: 'Fleet & route management' },
];

export default function StaffLoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('driver');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const update = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    setErrors(p => ({ ...p, [field]: '' }));
    setError('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsLoading(true);
    setError('');
    try {
      const res = await StaffService.login({ email: form.email, password: form.password });
      const token = res?.data?.token;
      const role  = res?.data?.user?.role;

      if (!token) throw new Error('No token received');

      sessionStorage.setItem('staff_token', token);
      sessionStorage.setItem('staff_role', role || selectedRole);

      navigate(`/employee/${role || selectedRole}/dashboard`);
    } catch (err) {
      setError(err?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="staff-login-page">
      <div className="staff-login-bg" aria-hidden="true">
        <div className="staff-orb staff-orb-1" />
        <div className="staff-orb staff-orb-2" />
      </div>

      <div className="staff-login-container">
        {/* Left Panel */}
        <div className="staff-left-panel">
          <Link to="/" className="staff-logo">
            <div className="staff-logo-icon">🚌</div>
            <span>Smart<span className="accent">Transit</span></span>
          </Link>

          <div className="staff-left-content">
            <h2>Staff Portal</h2>
            <p>Access your role-specific dashboard to manage transit operations.</p>

            <div className="staff-role-cards">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`staff-role-card ${selectedRole === r.value ? 'active' : ''}`}
                  onClick={() => setSelectedRole(r.value)}
                >
                  <span className="role-icon">{r.icon}</span>
                  <div>
                    <div className="role-label">{r.label}</div>
                    <div className="role-desc">{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Link to="/passenger/login" className="staff-switch-link">
            ← Passenger Login
          </Link>
        </div>

        {/* Right Form Panel */}
        <div className="staff-right-panel">
          <div className="staff-form-header">
            <h1>Sign In as {ROLES.find(r => r.value === selectedRole)?.label}</h1>
            <p>Enter your company credentials to access your dashboard.</p>
          </div>

          {error && (
            <div className="staff-alert-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="staff-form">
            <div className="staff-form-group">
              <label>Email Address</label>
              <input
                type="email"
                className={errors.email ? 'error' : ''}
                placeholder={`${selectedRole}@smarttransit.com`}
                value={form.email}
                onChange={e => update('email', e.target.value)}
                autoFocus
              />
              {errors.email && <span className="staff-field-error">{errors.email}</span>}
            </div>

            <div className="staff-form-group">
              <label>Password</label>
              <input
                type="password"
                className={errors.password ? 'error' : ''}
                placeholder="••••••••"
                value={form.password}
                onChange={e => update('password', e.target.value)}
              />
              {errors.password && <span className="staff-field-error">{errors.password}</span>}
            </div>

            <div className="staff-test-hint">
              <strong>Test credentials:</strong><br />
              Email: <code>{selectedRole}@smarttransit.com</code> &nbsp;|&nbsp; Password: <code>password123</code>
            </div>

            <button type="submit" className="staff-submit-btn" disabled={isLoading}>
              {isLoading ? 'Signing in…' : `Sign In as ${ROLES.find(r => r.value === selectedRole)?.label}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
