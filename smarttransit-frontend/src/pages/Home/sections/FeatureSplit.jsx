import { CheckIcon } from "../../../components/Icons.jsx";
import Button from "../../../components/ui/Button.jsx";

export default function FeatureSplit({
  reverse = false,
  eyebrow,
  title,
  description,
  bullets = [],
  cta,
  visual,
  tone = "white",
}) {
  return (
    <section className={tone === "tinted" ? "bg-white py-16 sm:py-20" : "bg-slate-50 py-16 sm:py-20"}>
      <div className="container-page">
        <div
          className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
            reverse ? "lg:[&>*:first-child]:order-2" : ""
          }`}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">{eyebrow}</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">{title}</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-500">{description}</p>

            {bullets.length > 0 && (
              <ul className="mt-6 space-y-3">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                      <CheckIcon size={13} />
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}

            {cta && (
              <Button to={cta.to} variant="primary" size="md" className="mt-7">
                {cta.label}
              </Button>
            )}
          </div>

          <div className="flex justify-center">{visual}</div>
        </div>
      </div>
    </section>
  );
}
