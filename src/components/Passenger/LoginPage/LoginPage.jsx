import { Link } from 'react-router-dom';
import { useLogin } from './login';
import '../styles/AuthPages.css';

export default function LoginPage() {
  const {
    form,
    errors,
    error,
    isLoading,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    update,
    handleSubmit,
  } = useLogin();

  return (
    <div className="auth-page auth-page-login">
      {/* Background */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-container auth-container-centered">
        {/* Left – Branding Panel */}
        <div className="auth-panel auth-info-panel">
          <Link to="/" className="navbar-logo" style={{ marginBottom: 'auto' }}>
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 6v6m0 0v6m0-6h8M8 12H4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="2" y="3" width="20" height="18" rx="3" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="logo-text">Smart<span className="logo-accent">Transit</span></span>
          </Link>

          <div className="info-panel-content">
            <h2 className="info-title">Welcome back!</h2>
            <p className="info-subtitle">Sign in to track your routes, check schedules, and manage your rides.</p>

            <div className="login-visual">
              <div className="lv-card glass-card">
                <div className="lv-card-header">
                  <div className="lv-status-dot" />
                  <span>Live — Bus 42A</span>
                </div>
                <div className="lv-route">
                  <div className="lv-stop lv-stop-done">Baclaran Terminal</div>
                  <div className="lv-line lv-line-done" />
                  <div className="lv-stop lv-stop-done">Taft Avenue</div>
                  <div className="lv-line lv-line-done" />
                  <div className="lv-stop lv-stop-current">
                    <span className="lv-bus-icon">🚌</span>
                    EDSA Ayala
                    <span className="lv-eta">3 min</span>
                  </div>
                  <div className="lv-line" />
                  <div className="lv-stop lv-stop-upcoming">Cubao Station</div>
                  <div className="lv-line" />
                  <div className="lv-stop lv-stop-upcoming">Monumento</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right – Login Form */}
        <div className="auth-panel auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">Sign In</h1>
            <p className="auth-subtitle">Enter your credentials to access your dashboard.</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate id="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  className={`form-input input-with-icon ${errors.email ? 'error' : ''}`}
                  placeholder="juan@example.com"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <div className="form-label-row">
                <label className="form-label" htmlFor="login-password">Password</label>
                <a href="#" className="auth-link form-forgot" id="forgot-password-link">Forgot password?</a>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input input-with-icon input-with-icon-right ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" /><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  }
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            {/* Remember Me */}
            <label className="checkbox-label" htmlFor="login-remember">
              <input
                id="login-remember"
                type="checkbox"
                className="checkbox-input"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span className="checkbox-custom" />
              <span>Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={isLoading}
              id="login-submit-btn"
            >
              {isLoading ? (
                <><span className="spinner" aria-hidden="true" /> Signing in…</>
              ) : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/passenger/signup" className="auth-link" id="switch-to-signup">Create one free</Link>
          </p>

          <p className="auth-back-link">
            <Link to="/" className="auth-link-muted" id="back-to-home">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
