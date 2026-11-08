import { Link } from "react-router-dom";
import { MapPinIcon } from "./Icons.jsx";
import Logo from "./Logo.jsx";
import { useTour } from "./tour/TourProvider.jsx";

// Matches the hosted SmartTransit footer: brand blurb, then Quick Links,
// Passenger and Legal columns. "Take the tour" restarts the onboarding tour.
const REGION = "Davao Region";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Track Bus", to: "/track-bus" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact Us", to: "/contact" },
];

const PASSENGER_LINKS = [
  { label: "Track a Bus", to: "/track-bus" },
  { label: "Log In", to: "/login" },
  { label: "Create Account", to: "/signup" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms of Service", to: "/terms" },
];

const linkClass = "text-slate-400 transition-colors hover:text-white";

function FooterColumn({ title, links, children }) {
  return (
    <div>
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className={linkClass}>
              {link.label}
            </Link>
          </li>
        ))}
        {children}
      </ul>
    </div>
  );
}

export default function Footer() {
  const { startTour } = useTour();

  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" aria-label="SmartTransit home" className="inline-flex">
            <Logo className="h-12" onDark />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Real-time bus tracking, digital tickets, and trip management for commuters across{" "}
            {REGION}.
          </p>
          <p className="mt-4 flex items-start gap-2.5 text-sm text-slate-400">
            <MapPinIcon size={18} className="mt-0.5 shrink-0 text-teal-400" aria-hidden="true" />
            Serving terminals across {REGION}
          </p>
        </div>

        <FooterColumn title="Quick Links" links={QUICK_LINKS} />

        <FooterColumn title="Passenger" links={PASSENGER_LINKS}>
          <li>
            <button type="button" onClick={startTour} className={linkClass}>
              Take the tour
            </button>
          </li>
        </FooterColumn>

        <FooterColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} SmartTransit. All rights reserved.</p>
          <p>Bus transportation platform for {REGION}</p>
        </div>
      </div>
    </footer>
  );
}
