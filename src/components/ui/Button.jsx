import { Link } from "react-router-dom";

const VARIANTS = {
  primary:
    "bg-navy-800 text-white hover:bg-navy-900 focus-visible:outline-navy-800 shadow-sm",
  accent:
    "bg-teal-400 text-navy-900 hover:bg-teal-500 focus-visible:outline-teal-600 shadow-sm",
  outline:
    "border border-navy-800 text-navy-800 hover:bg-navy-800 hover:text-white bg-white",
  ghost: "text-navy-800 hover:bg-navy-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  white: "bg-white text-navy-800 hover:bg-slate-100 shadow-sm",
};

const SIZES = {
  sm: "px-3.5 py-2 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3.5 text-base gap-2",
};

export default function Button({
  as,
  to,
  href,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  children,
  ...props
}) {
  const classes = `inline-flex items-center justify-center rounded-full font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
