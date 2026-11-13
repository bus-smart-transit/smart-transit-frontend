import { useState } from "react";
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
  onPointerDown,
  ...props
}) {
  const [ripples, setRipples] = useState([]);

  // Ripple: a soft circle that spreads from where the button was pressed.
  const handlePointerDown = (event) => {
    onPointerDown?.(event);
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const id = Date.now() + Math.random();
    setRipples((prev) => [
      ...prev,
      { id, size, x: event.clientX - rect.left - size / 2, y: event.clientY - rect.top - size / 2 },
    ]);
  };

  const content = (
    <>
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-current motion-safe:animate-ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          onAnimationEnd={() => setRipples((prev) => prev.filter((x) => x.id !== r.id))}
        />
      ))}
    </>
  );

  const classes = `relative isolate overflow-hidden inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} onPointerDown={handlePointerDown} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} onPointerDown={handlePointerDown} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button className={classes} disabled={disabled} onPointerDown={handlePointerDown} {...props}>
      {content}
    </button>
  );
}
