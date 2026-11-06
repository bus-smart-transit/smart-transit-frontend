import { useState } from 'react';

// 2026-11-07 (passenger redesign, joshua-frontend): the SmartTransit team. To add a photo, put it in
// public/images/team/ and set photo: '/images/team/<file>.jpg'; until then the card shows initials.
const TEAM = [
  { name: 'De Vila', role: 'Project Manager', photo: null },
  { name: 'Jhon Michael Murcia', role: 'Backend Developer', photo: null },
  { name: 'Ang', role: 'Frontend Developer', photo: null },
  { name: 'Joshua Galo', role: 'UI/UX Designer', photo: null },
  { name: 'Hassanal', role: 'QA & Documentation', photo: null },
];

const initials = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const DOT_PATTERN = {
  backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.55) 1px, transparent 1.6px)',
  backgroundSize: '10px 10px',
  maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
  WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
};

/** The people behind SmartTransit: a row of cards; the one pointed at (or the middle one) is lifted. */
export default function TeamSection({ regionName }) {
  const middle = Math.floor(TEAM.length / 2);
  const [active, setActive] = useState(middle);

  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-24" aria-labelledby="team-heading">
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-6 h-72 w-80 sm:left-6" style={DOT_PATTERN} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-6 h-72 w-80 sm:right-6" style={DOT_PATTERN} />

      <div className="container-page relative">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
            The people behind SmartTransit
          </span>
          <h2 id="team-heading" className="mt-5 font-display text-4xl font-bold tracking-tight text-navy-950 sm:text-5xl">Meet Our Team</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            A small team building a simpler, more reliable way to ride{regionName ? ` across ${regionName}` : ''}.
          </p>
        </div>

        <ul className="-mx-4 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 lg:gap-5" onMouseLeave={() => setActive(middle)}>
          {TEAM.map(({ name, role, photo }, index) => {
            const isActive = index === active;
            return (
              <li
                key={name}
                onMouseEnter={() => setActive(index)}
                className="w-40 shrink-0 snap-center sm:w-[18%] sm:max-w-[13rem] sm:translate-y-[var(--offset)]"
                style={{ '--offset': `${Math.abs(index - middle) * 18}px` }}
              >
                <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl transition-all duration-500 ${isActive ? 'scale-105 shadow-[0_20px_50px_-12px_rgba(167,139,250,0.55)]' : 'shadow-sm'}`}>
                  {photo ? (
                    <img src={photo} alt="" className={`h-full w-full object-cover transition duration-500 ${isActive ? 'grayscale-0' : 'grayscale'}`} />
                  ) : (
                    <span aria-hidden="true" className={`flex h-full w-full items-start justify-center pt-[22%] font-display text-4xl font-bold transition-colors duration-500 ${isActive ? 'bg-gradient-to-br from-amber-100 via-rose-100 to-violet-300 text-violet-900/70' : 'bg-gradient-to-b from-slate-100 to-slate-300 text-slate-400'}`}>
                      {initials(name)}
                    </span>
                  )}
                  <div className="absolute inset-x-2 bottom-2 rounded-lg border border-white/40 bg-slate-900/25 px-3 py-2 text-left backdrop-blur-md">
                    <h3 className="truncate text-sm font-semibold text-white">{name}</h3>
                    <p className="truncate text-xs text-white/80">{role}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
