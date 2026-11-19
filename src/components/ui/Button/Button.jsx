import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Button component matching the design team's reference implementation
 * (pill-shaped, navy/teal variants) with `loading`/`icon` support added
 * since existing pages (Login, Forgot/Reset Password) depend on them.
 */
const VARIANTS = {
  primary: 'bg-navy-800 text-white hover:bg-navy-900 focus-visible:outline-navy-800 shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none',
  accent: 'bg-teal-400 text-navy-900 hover:bg-teal-500 focus-visible:outline-teal-600 shadow-sm disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none',
  outline: 'border border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white bg-white disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-white',
  ghost: 'text-navy-800 hover:bg-navy-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500',
  white: 'bg-white text-navy-800 hover:bg-slate-100 shadow-sm disabled:bg-slate-50 disabled:text-slate-400',
  // Legacy aliases so existing callers using the previous variant names
  // keep working without needing to be updated one-by-one.
  secondary: 'bg-slate-100 text-navy-900 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
};

const SIZES = {
  xs: 'px-3 py-1.5 text-xs gap-1',
  sm: 'px-3.5 py-2 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2',
};

const Button = React.forwardRef(({
  as,
  to,
  href,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon = null,
  iconPosition = 'left',
  children,
  className = '',
  ...props
}, ref) => {
  const classes = `inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`;

  const content = (
    <>
      {loading && (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
    </>
  );

  if (to) {
    return (
      <Link ref={ref} to={to} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a ref={ref} href={href} className={classes} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button ref={ref} disabled={disabled || loading} className={classes} {...props}>
      {content}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
