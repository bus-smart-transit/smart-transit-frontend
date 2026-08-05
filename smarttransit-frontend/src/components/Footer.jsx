import { Link } from "react-router-dom";
import { BusIcon, MailIcon, PhoneIcon, MapPinIcon } from "./Icons.jsx";

const QUICK_LINKS = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "News", to: "/news" },
  { label: "FAQ", to: "/faq" },
  { label: "Contact Us", to: "/contact" },
];

const ACCOUNT_LINKS = [
  { label: "Track a Bus", to: "/track-bus" },
  { label: "Log In", to: "/login" },
  { label: "Create Account", to: "/signup" },
];

export default function Footer() {
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <BusIcon size={22} />
            </span>
            <span className="font-display text-lg font-bold">SmartTransit</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Real-time bus tracking, digital tickets, and trip management for commuters
            across Davao Region XI.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Quick Links
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-slate-400 transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Passenger
          </h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-slate-400 transition-colors hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wide text-white">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            <li className="flex items-start gap-2.5">
              <MapPinIcon size={18} className="mt-0.5 shrink-0 text-teal-400" />
              Serving terminals across Davao Region XI
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon size={16} className="shrink-0 text-teal-400" />
              (082) 123 4567
            </li>
            <li className="flex items-center gap-2.5">
              <MailIcon size={16} className="shrink-0 text-teal-400" />
              support@smarttransit-davao.ph
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} SmartTransit. All rights reserved.</p>
          <p>Bus transportation platform for Davao Region XI</p>
        </div>
      </div>
    </footer>
  );
}
