import React from 'react';

/**
 * Versatile Button component supporting multiple variants and sizes.
 * Supports both Router Links and regular buttons.
 */
const Button = React.forwardRef(({
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
  // Variant styles
  const variantStyles = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500',
    secondary: 'bg-slate-100 text-navy-900 hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
    accent: 'bg-amber-400 text-navy-950 hover:bg-amber-500 disabled:bg-slate-300 disabled:text-slate-500 font-semibold',
    white: 'bg-white text-navy-900 hover:bg-slate-50 border border-slate-200 disabled:bg-slate-50 disabled:text-slate-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500',
    ghost: 'text-navy-900 hover:bg-slate-100 disabled:text-slate-400',
  };

  // Size styles
  const sizeStyles = {
    xs: 'px-2 py-1 text-xs gap-1',
    sm: 'px-3 py-2 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500';

  const buttonClass = `${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`;

  const content = (
    <>
      {loading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={16} />}
    </>
  );

  // If it's a link button (has 'to' prop), render as Link
  if (props.to) {
    const { to, ...linkProps } = props;
    const { Link } = require('react-router-dom');
    return (
      <Link to={to} className={buttonClass} {...linkProps}>
        {content}
      </Link>
    );
  }

  // Otherwise render as regular button
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClass}
      {...props}
    >
      {content}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
