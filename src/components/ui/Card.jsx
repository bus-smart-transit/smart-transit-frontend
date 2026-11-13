export default function Card({ as: As = "div", className = "", children, ...props }) {
  return (
    <As
      className={`rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-300 hover:shadow-card-hover ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}
