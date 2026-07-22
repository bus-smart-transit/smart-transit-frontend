import { Link } from 'react-router-dom';
import './LandingPage.css';

/* ── Icon Components ── */
const Icon = ({ d, size = 24, viewBox = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const FEATURES = [
  {
    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
    title: "Real-Time Tracking",
    desc: "See exactly where your bus is on the map with live GPS updates every few seconds.",
  },
  {
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "Smart Schedules",
    desc: "Dynamic timetables adjust to traffic so you always get the most accurate arrival times.",
  },
  {
    icon: "M3 10h18M3 6h18M3 14h18M3 18h18",
    title: "Route Planning",
    desc: "Plan multi-stop journeys with intelligent route suggestions tailored to your location.",
  },
  {
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    title: "Instant Alerts",
    desc: "Get notified for delays, route changes, and when your bus is approaching your stop.",
  },
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Secure Payments",
    desc: "Pay for rides digitally with end-to-end encryption keeping your data safe.",
  },
  {
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    title: "Ride Analytics",
    desc: "Track your commute history, spending, and CO₂ saved with detailed dashboards.",
  },
];

const STATS = [
  { value: '50K+', label: 'Daily Riders' },
  { value: '200+', label: 'Active Routes' },
  { value: '98%', label: 'On-Time Rate' },
  { value: '4.9★', label: 'App Rating' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create Your Account',
    desc: 'Sign up for free and set up your passenger profile in under a minute.',
  },
  {
    step: '02',
    title: 'Find Your Route',
    desc: 'Search for routes by destination or browse available lines in your area.',
  },
  {
    step: '03',
    title: 'Track & Ride',
    desc: 'Get real-time bus location, estimated arrival, and ride with confidence.',
  },
];

const OBJECTIVES = [
  {
    title: 'Passenger Data Validation',
    endpoint: '/passengers/profile, /passengers/tickets, /passengers/rewards/history',
    action: 'Open Passenger Dashboard',
    to: '/passenger/login',
  },
  {
    title: 'Driver Trip Operations',
    endpoint: '/driver/current-trip, /driver/current-trip/stops, /driver/daily-pin',
    action: 'Open Staff Login (Driver)',
    to: '/employee/login',
  },
  {
    title: 'Conductor Scan and Occupancy',
    endpoint: '/conductor/scan-ticket, /conductor/trip-occupancy, /conductor/current-passengers',
    action: 'Open Staff Login (Conductor)',
    to: '/employee/login',
  },
  {
    title: 'Operator Resource Accuracy',
    endpoint: '/operator/fleets, /operator/drivers, /operator/conductors',
    action: 'Open Staff Login (Operator)',
    to: '/employee/login',
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      {/* ── Hero Section ── */}
      <section className="hero-section" id="home">
        {/* Background glow orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />
        <div className="hero-orb hero-orb-3" aria-hidden="true" />

        <div className="container hero-content">
          <div className="hero-badge">
            <span className="badge badge-primary">
              <span className="badge-dot" />
              Live Transit Tracking
            </span>
          </div>

          <h1 className="hero-title">
            Your City, <br />
            <span className="gradient-text">On Your Schedule</span>
          </h1>

          <p className="hero-subtitle">
            SmartTransit brings real-time bus tracking, intelligent routing, and seamless ticketing
            into one beautiful platform. Never miss your ride again.
          </p>

          <div className="hero-actions">
            <Link to="/passenger/signup" className="btn btn-primary btn-lg" id="hero-signup-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Get Started Free
            </Link>
            <a href="#features" className="btn btn-outline btn-lg" id="hero-learn-btn">
              Learn More
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          {/* Mini trust row */}
          <div className="hero-trust">
            <div className="trust-avatars" aria-hidden="true">
              {['S', 'M', 'A', 'J', 'K'].map((l, i) => (
                <div key={i} className="trust-avatar" style={{ background: `hsl(${i * 60 + 200}, 70%, 55%)` }}>{l}</div>
              ))}
            </div>
            <p className="trust-text">
              Trusted by <strong>50,000+</strong> daily commuters
            </p>
          </div>
        </div>

        {/* Hero visual card */}
        <div className="container hero-visual-wrapper">
          <div className="hero-visual glass-card">
            <div className="hv-header">
              <div className="hv-dot red" /><div className="hv-dot yellow" /><div className="hv-dot green" />
              <span className="hv-title">Live Bus Tracker</span>
            </div>
            <div className="hv-map">
              <div className="hv-map-bg" aria-hidden="true">
                {/* Animated route line */}
                <svg className="hv-map-svg" viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[30, 60, 90, 120, 150].map(y => (
                    <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  ))}
                  {[50, 100, 150, 200, 250, 300, 350].map(x => (
                    <line key={x} x1={x} y1="0" x2={x} y2="180" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  ))}
                  {/* Route path */}
                  <path d="M 30 140 Q 80 140 100 110 Q 130 70 180 70 Q 230 70 250 90 Q 280 120 320 100 Q 355 80 380 60"
                    stroke="url(#routeGrad)" strokeWidth="3" fill="none" strokeDasharray="6 3"
                    className="route-path" />
                  {/* Stops */}
                  {[[30, 140], [100, 110], [180, 70], [250, 90], [320, 100], [380, 60]].map(([cx, cy], i) => (
                    <circle key={i} cx={cx} cy={cy} r="5" fill={i === 2 ? '#2563eb' : 'rgba(255,255,255,0.3)'}
                      stroke={i === 2 ? '#60a5fa' : 'rgba(255,255,255,0.1)'} strokeWidth="2" />
                  ))}
                  {/* Bus icon */}
                  <g className="bus-icon" transform="translate(168,57)">
                    <rect x="-10" y="-9" width="20" height="14" rx="3" fill="#2563eb" />
                    <rect x="-7" y="-7" width="5" height="5" rx="1" fill="rgba(255,255,255,0.5)" />
                    <rect x="2" y="-7" width="5" height="5" rx="1" fill="rgba(255,255,255,0.5)" />
                    <circle cx="-6" cy="6" r="2.5" fill="#1e40af" />
                    <circle cx="6" cy="6" r="2.5" fill="#1e40af" />
                  </g>
                </svg>
              </div>
            </div>
            {/* Info cards overlay */}
            <div className="hv-info-row">
              <div className="hv-info-card">
                <span className="hv-info-label">Next Arrival</span>
                <span className="hv-info-value">3 min</span>
              </div>
              <div className="hv-info-card">
                <span className="hv-info-label">Route</span>
                <span className="hv-info-value">Bus 42A</span>
              </div>
              <div className="hv-info-card">
                <span className="hv-info-label">Occupancy</span>
                <span className="hv-info-value hv-info-green">Low</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Objective Testing Section ── */}
      <section className="objective-section" id="testing">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-primary">Backend Objectives</span>
            <h2 className="section-title">Test Every Role With <span className="gradient-text">Clear Entry Points</span></h2>
            <p className="section-subtitle">
              This workspace is configured for endpoint validation, data accuracy checks, and role-specific smoke testing.
            </p>
          </div>

          <div className="objectives-grid">
            {OBJECTIVES.map(({ title, endpoint, action, to }) => (
              <div key={title} className="objective-card glass-card">
                <h3 className="objective-title">{title}</h3>
                <p className="objective-endpoint">{endpoint}</p>
                <Link to={to} className="btn btn-outline objective-link">{action}</Link>
              </div>
            ))}
          </div>

          <div className="credentials-card glass-card">
            <h3>Quick Test Credentials</h3>
            <p>Passenger: passenger@test.com / password123</p>
            <p>Driver: driver@smarttransit.com / password123</p>
            <p>Conductor: conductor@smarttransit.com / password123</p>
            <p>Operator: operator@smarttransit.com / password123</p>
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="stats-section">
        <div className="container stats-grid">
          {STATS.map(({ value, label }) => (
            <div key={label} className="stat-item">
              <span className="stat-value gradient-text">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-primary">Features</span>
            <h2 className="section-title">Everything you need to <span className="gradient-text">commute smarter</span></h2>
            <p className="section-subtitle">
              Powerful tools designed to transform your daily transit experience.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="feature-card glass-card">
                <div className="feature-icon-wrap">
                  <Icon d={icon} size={22} />
                </div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="how-section" id="routes">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-primary">How It Works</span>
            <h2 className="section-title">Up and running <span className="gradient-text">in minutes</span></h2>
            <p className="section-subtitle">Three easy steps to start your smarter commute.</p>
          </div>

          <div className="steps-grid">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="step-card">
                <div className="step-number">{step}</div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="step-connector" aria-hidden="true" />
                )}
                <h3 className="step-title">{title}</h3>
                <p className="step-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="cta-section" id="about">
        <div className="container">
          <div className="cta-card glass-card">
            <div className="cta-glow" aria-hidden="true" />
            <span className="badge badge-primary">Start Today</span>
            <h2 className="cta-title">Ready for a smarter commute?</h2>
            <p className="cta-desc">
              Join thousands of passengers already using SmartTransit. Sign up for free — no credit card required.
            </p>
            <div className="cta-actions">
              <Link to="/passenger/signup" className="btn btn-primary btn-lg" id="cta-signup-btn">
                Create Free Account
              </Link>
              <Link to="/passenger/login" className="btn btn-outline" id="cta-login-btn">
                Already have an account? Log In
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
