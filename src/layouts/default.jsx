import { Link, Outlet } from 'react-router-dom';
import { usePublicLayout } from '../api/hooks/usePublicLayout';
import './PublicLayout.css'; // Points to the CSS file in the same folder

export default function DefaultLayout() {
    const { scrolled, menuOpen, setMenuOpen, closeMenu, navLinks, loginPath, signupPath } = usePublicLayout();

    return (
        <div className="public-layout">
            {/* ── Navbar ── */}
            <header className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
                <div className="container navbar-inner">
                    <Link to="/" className="navbar-logo" onClick={closeMenu}>
                        <div className="logo-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 6v6m0 0v6m0-6h8M8 12H4" strokeLinecap="round" strokeLinejoin="round" />
                                <rect x="2" y="3" width="20" height="18" rx="3" strokeWidth="1.5" />
                            </svg>
                        </div>
                        <span className="logo-text">Smart<span className="logo-accent">Transit</span></span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <nav className="navbar-links" aria-label="Main navigation">
                        {navLinks.map(({ label, to }) => (
                            <a key={label} href={to} className="nav-link">{label}</a>
                        ))}
                    </nav>

                    {/* Auth Button Options */}
                    <div className="navbar-auth">
                        <Link to={loginPath} className="btn btn-ghost btn-sm">Log In</Link>
                        <Link to={signupPath} className="btn btn-primary btn-sm">Get Started</Link>
                    </div>

                    {/* Mobile Hamburger Menu Toggle */}
                    <button
                        className={`hamburger ${menuOpen ? 'open' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle navigation menu"
                    >
                        <span /><span /><span />
                    </button>
                </div>

                {/* Mobile Menu Dropdown Panel */}
                <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
                    {navLinks.map(({ label, to }) => (
                        <a key={label} href={to} className="mobile-nav-link" onClick={closeMenu}>
                            {label}
                        </a>
                    ))}
                    <div className="mobile-auth">
                        <Link to={loginPath} className="btn btn-ghost btn-full" onClick={closeMenu}>Log In</Link>
                        <Link to={signupPath} className="btn btn-primary btn-full" onClick={closeMenu}>Get Started</Link>
                    </div>
                </div>
            </header>

            {/* ── Dynamic Child Route Content Insertion Point ── */}
            <main className="public-main">
                <Outlet />
            </main>

            {/* ── Global Footer ── */}
            <footer className="footer">
                <div className="container footer-inner">
                    <div className="footer-brand">
                        <Link to="/" className="navbar-logo">
                            <span className="logo-text">Smart<span className="logo-accent">Transit</span></span>
                        </Link>
                        <p className="footer-tagline">Smarter journeys, every day.</p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-col">
                            <h4>Product</h4>
                            {navLinks.map(({ label, to }) => <a key={label} href={to}>{label}</a>)}
                        </div>
                        <div className="footer-col">
                            <h4>Account</h4>
                            <Link to={loginPath}>Log In</Link>
                            <Link to={signupPath}>Sign Up</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}