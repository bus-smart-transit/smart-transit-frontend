import { Link } from 'react-router-dom';
import { useSignUp } from './signup';
import '../styles/AuthPages.css';

export default function SignUpPage() {
  const {
    step,
    setStep,
    isLoading,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    error,
    success,
    form,
    errors,
    update,
    handleStep1,
    handleSubmit,
    strength,
    si,
  } = useSignUp();

  return (
    <div className="auth-page">
      {/* Background */}
      <div className="auth-bg" aria-hidden="true">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-container">
        {/* Left Panel */}
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
            <h2 className="info-title">Join thousands of commuters</h2>
            <p className="info-subtitle">Get real-time tracking, smart routing, and seamless ticketing — all in one place.</p>

            <ul className="info-perks">
              {[
                'Free account, forever',
                'Live GPS tracking',
                'Smart route suggestions',
                'Instant delay notifications',
              ].map(perk => (
                <li key={perk}>
                  <span className="perk-check">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>

          {/* Step indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}><span>1</span><label>Info</label></div>
            <div className="step-line" />
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}><span>2</span><label>Security</label></div>
          </div>
        </div>

        {/* Right Panel – Form */}
        <div className="auth-panel auth-form-panel">
          <div className="auth-form-header">
            <h1 className="auth-title">
              {step === 1 ? 'Create Your Account' : 'Secure Your Account'}
            </h1>
            <p className="auth-subtitle">
              {step === 1
                ? 'Enter your personal information to get started.'
                : 'Set a strong password to protect your account.'}
            </p>
          </div>

          {/* Error / Success banners */}
          {error && (
            <div className="alert alert-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {success}
            </div>
          )}

          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <form className="auth-form" onSubmit={handleStep1} noValidate id="signup-step1-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-firstName">First Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      id="signup-firstName"
                      type="text"
                      className={`form-input input-with-icon ${errors.firstName ? 'error' : ''}`}
                      placeholder="Juan"
                      value={form.firstName}
                      onChange={e => update('firstName', e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  {errors.firstName && <span className="form-error">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-lastName">Last Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                    <input
                      id="signup-lastName"
                      type="text"
                      className={`form-input input-with-icon ${errors.lastName ? 'error' : ''}`}
                      placeholder="dela Cruz"
                      value={form.lastName}
                      onChange={e => update('lastName', e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                  {errors.lastName && <span className="form-error">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="signup-email"
                    type="email"
                    className={`form-input input-with-icon ${errors.email ? 'error' : ''}`}
                    placeholder="juan@example.com"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-phone">Phone Number</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="signup-phone"
                      type="tel"
                      className={`form-input input-with-icon ${errors.phone ? 'error' : ''}`}
                      placeholder="+63 9XX XXX XXXX"
                      value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone && <span className="form-error">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-dob">Date of Birth</label>
                  <div className="input-wrapper">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    <input
                      id="signup-dob"
                      type="date"
                      className={`form-input input-with-icon ${errors.dateOfBirth ? 'error' : ''}`}
                      value={form.dateOfBirth}
                      onChange={e => update('dateOfBirth', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  {errors.dateOfBirth && <span className="form-error">{errors.dateOfBirth}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-address">Address <span className="form-label-optional">(Optional)</span></label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeLinecap="round" />
                      <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="signup-address"
                    type="text"
                    className="form-input input-with-icon"
                    placeholder="123 Rizal St, Manila"
                    value={form.address}
                    onChange={e => update('address', e.target.value)}
                    autoComplete="street-address"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full" id="signup-next-btn">
                Continue to Security
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          )}

          {/* ── Step 2: Password & Terms ── */}
          {step === 2 && (
            <form className="auth-form" onSubmit={handleSubmit} noValidate id="signup-step2-form">
              <div className="form-group">
                <label className="form-label" htmlFor="signup-password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`form-input input-with-icon input-with-icon-right ${errors.password ? 'error' : ''}`}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                    autoComplete="new-password"
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
                {/* Strength bar */}
                {form.password && (
                  <div className="strength-bar-wrapper">
                    <div className="strength-bar">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div
                          key={i}
                          className="strength-segment"
                          style={{ background: i <= strength ? si.color : 'rgba(255,255,255,0.08)' }}
                        />
                      ))}
                    </div>
                    <span className="strength-label" style={{ color: si.color }}>{si.label}</span>
                  </div>
                )}
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="signup-confirm">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  <input
                    id="signup-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={`form-input input-with-icon input-with-icon-right ${errors.confirmPassword ? 'error' : ''}`}
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={e => update('confirmPassword', e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" /><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" /></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    }
                  </button>
                </div>
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>

              {/* Password hints */}
              <div className="password-hints">
                {[
                  { check: form.password.length >= 8, label: 'At least 8 characters' },
                  { check: /[A-Z]/.test(form.password), label: 'One uppercase letter' },
                  { check: /[a-z]/.test(form.password), label: 'One lowercase letter' },
                  { check: /\d/.test(form.password), label: 'One number' },
                ].map(({ check, label }) => (
                  <div key={label} className={`hint-item ${check ? 'met' : ''}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {label}
                  </div>
                ))}
              </div>

              {/* Terms checkbox */}
              <div className="form-group">
                <label className={`checkbox-label ${errors.agreeTerms ? 'checkbox-error' : ''}`} htmlFor="signup-terms">
                  <input
                    id="signup-terms"
                    type="checkbox"
                    className="checkbox-input"
                    checked={form.agreeTerms}
                    onChange={e => update('agreeTerms', e.target.checked)}
                  />
                  <span className="checkbox-custom" />
                  <span>
                    I agree to the{' '}
                    <a href="#" className="auth-link">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="auth-link">Privacy Policy</a>
                  </span>
                </label>
                {errors.agreeTerms && <span className="form-error" style={{ marginTop: '4px' }}>{errors.agreeTerms}</span>}
              </div>

              <div className="form-row-buttons">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(1)}
                  id="signup-back-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                  id="signup-submit-btn"
                  style={{ flex: 1 }}
                >
                  {isLoading ? (
                    <><span className="spinner" aria-hidden="true" /> Creating account…</>
                  ) : (
                    <>Create Account</>
                  )}
                </button>
              </div>
            </form>
          )}

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/passenger/login" className="auth-link" id="switch-to-login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
