import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import BrandLogo from '../ui/BrandLogo';
import { useRegion } from '../../api/hooks/useRegion';

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'News', to: '/news' },
  { label: 'FAQ', to: '/#faq' },
  { label: 'Contact Us', to: '/contact' },
];

const PASSENGER_LINKS = [
  { label: 'Track a Bus', to: '/track-bus' },
  { label: 'Log In', to: '/passenger/login' },
  { label: 'Create Account', to: '/passenger/signup' },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
];

function LinkColumn({ title, links }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.label}><Link to={link.to} className="text-slate-400 transition-colors hover:text-white">{link.label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * 2026-11-06 (passenger redesign, joshua-frontend): the site footer with link columns. The region name comes from the
 * server. No phone number or email is shown until real ones are given (no made-up contact details).
 */
export default function Footer() {
  const region = useRegion();
  const area = region?.name ? ` across ${region.name}` : '';

  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" aria-label="SmartTransit home" className="inline-flex"><BrandLogo light className="h-12" /></Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Real-time bus tracking, digital tickets, and trip management for commuters{area}.
          </p>
          {region?.name && (
            <p className="mt-4 flex items-start gap-2.5 text-sm text-slate-400">
              <MapPin size={18} className="mt-0.5 shrink-0 text-teal-400" aria-hidden="true" />
              Serving terminals{area}
            </p>
          )}
        </div>
        <LinkColumn title="Quick Links" links={QUICK_LINKS} />
        <LinkColumn title="Passenger" links={PASSENGER_LINKS} />
        <LinkColumn title="Legal" links={LEGAL_LINKS} />
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} SmartTransit. All rights reserved.</p>
          {region?.name && <p>Bus transportation platform for {region.name}</p>}
        </div>
      </div>
    </footer>
  );
}
