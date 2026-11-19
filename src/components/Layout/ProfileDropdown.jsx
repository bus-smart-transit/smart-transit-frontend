import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LayoutGrid, Ticket, History, MapPin, Gift, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../api/hooks/useAuth';

const MENU_ITEMS = [
  { to: '/passenger/dashboard?tab=dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/passenger/dashboard?tab=tickets', label: 'My Tickets', icon: Ticket },
  { to: '/passenger/dashboard?tab=transactions', label: 'Trip History', icon: History },
  { to: '/passenger/dashboard?tab=map', label: 'Track Bus', icon: MapPin },
  { to: '/passenger/dashboard?tab=rewards', label: 'Rewards', icon: Gift },
  { to: '/passenger/dashboard?tab=profile', label: 'Profile', icon: User },
];

export default function ProfileDropdown({ variant = 'light' }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!user) return null;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/');
  };

  const name = user.name || user.username || user.email || 'Passenger';
  const firstName = name.split(' ')[0];
  const isDark = variant === 'dark';

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-semibold transition-colors ${
          isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-navy-900 hover:bg-slate-200'
        }`}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-400 text-sm font-bold text-navy-900">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span>Hi, {firstName}</span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-fade-in"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">{name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="py-1.5">
            {MENU_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-900"
              >
                <Icon size={18} className="text-slate-400" />
                {label}
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-1.5">
            <button
              type="button"
              onClick={handleLogout}
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
