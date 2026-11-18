import { useEffect, useRef, useState } from 'react';

// 2026-11-18 (user): the cards take turns on their own, one every 2 seconds.
const AUTO_ADVANCE_MS = 2000;
// After a touch, wait this long before taking turns again so a swipe is not fought.
const RESUME_AFTER_TOUCH_MS = 5000;

// 2026-11-07 (passenger redesign, joshua-frontend): the SmartTransit team. To add a photo, put it in
// public/images/team/ and set photo: '/images/team/<file>.jpg'; until then the card shows initials.
// 2026-11-18: full names, and stand-in illustrated avatars (DiceBear "Lorelei", CC0) until real photos are added.
const TEAM = [
  { name: 'Jan Blair De Vila', role: 'Project Manager', photo: '/images/team/member-1.svg' },
  { name: 'Everest T. Ang', role: 'Frontend Developer', photo: '/images/team/member-3.svg' },
  { name: 'Jhon Michael A. Murcia', role: 'Backend Developer', photo: '/images/team/member-2.svg' },
  { name: 'Joshua P. Galo', role: 'UI/UX Designer', photo: '/images/team/member-4.svg' },
  { name: 'Hasannal Guiabar', role: 'QA & Documentation', photo: '/images/team/member-5.svg' },
];

const initials = (name) => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const DOT_PATTERN = {
  backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.55) 1px, transparent 1.6px)',
  backgroundSize: '10px 10px',
  maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
  WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
};

const N = TEAM.length;
// 2026-11-18 (user): an endless loop that only ever moves forward. On a phone the row is drawn three times
// (copy 0 | copy 1 | copy 2); the turns run through copy 1 into copy 2, and once a card of copy 2 is centred
// the row jumps, without animation, to the same person in copy 1. The two look identical, so it never rewinds.
// On wider screens the extra copies are hidden and only copy 1 shows.
const COPIES = [0, 1, 2];
const LOOP_JUMP_DELAY_MS = 600; // after the smooth slide has finished

/** The people behind SmartTransit: a row of cards; the one pointed at (or the middle one) is lifted. */
export default function TeamSection({ regionName }) {
  const middle = Math.floor(N / 2);
  // `active` counts across all three copies (0 to 3N-1); the person is `active % N`.
  const [active, setActive] = useState(N + middle);
  const [paused, setPaused] = useState(false);
  const listRef = useRef(null);
  const resumeTimer = useRef(null);
  const jumpTimer = useRef(null);
  const instant = useRef(true); // the first placement and the loop jumps are not animated

  // Move to the next person every 2 seconds, unless paused or the viewer asked for less motion.
  useEffect(() => {
    if (paused) return undefined;
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return undefined;
    const id = setInterval(() => setActive((current) => current + 1), AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused]);

  // Slide the active card to the centre (sideways only, never the page), then fold back into copy 1 if needed.
  useEffect(() => {
    const list = listRef.current;
    const card = list?.children[active];
    if (list && card && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: card.offsetLeft - (list.clientWidth - card.clientWidth) / 2, behavior: instant.current ? 'auto' : 'smooth' });
    }
    instant.current = false;
    if (active >= N && active < 2 * N) return undefined;
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => {
      instant.current = true;
      setActive((current) => (current >= 2 * N ? current - N : current < N ? current + N : current));
    }, LOOP_JUMP_DELAY_MS);
    return () => clearTimeout(jumpTimer.current);
  }, [active]);

  const touched = useRef(false);
  const scrollTimer = useRef(null);
  useEffect(() => () => { clearTimeout(resumeTimer.current); clearTimeout(scrollTimer.current); clearTimeout(jumpTimer.current); }, []);

  // After the viewer swipes, light up whichever card ended in the middle so the turns carry on from there.
  const onScroll = () => {
    if (!touched.current) return;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const list = listRef.current;
      if (!list) return;
      const centre = list.scrollLeft + list.clientWidth / 2;
      let nearest = 0;
      [...list.children].forEach((card, index) => {
        const best = list.children[nearest];
        const distance = (el) => Math.abs(el.offsetLeft + el.clientWidth / 2 - centre);
        if (distance(card) < distance(best)) nearest = index;
      });
      setActive(nearest);
    }, 150);
  };

  const pauseForTouch = () => {
    setPaused(true);
    touched.current = true;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { touched.current = false; setPaused(false); }, RESUME_AFTER_TOUCH_MS);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-mist py-16 sm:py-24" aria-labelledby="team-heading">
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-6 h-72 w-80 sm:left-6" style={DOT_PATTERN} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-6 h-72 w-80 sm:right-6" style={DOT_PATTERN} />

      <div className="container-page relative">
        <div className="mx-auto max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-fog bg-mist px-3 py-1 text-xs font-medium text-ocean shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
            The people behind SmartTransit
          </span>
          <h2 id="team-heading" className="mt-5 font-display text-4xl font-bold tracking-tight text-navy-950 sm:text-5xl">Meet Our Team</h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            A small team building a simpler, more reliable way to ride{regionName ? ` across ${regionName}` : ''}.
          </p>
        </div>

        <ul className="-mx-4 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:mx-0 sm:justify-center sm:overflow-visible sm:px-0 lg:gap-5"
          ref={listRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={pauseForTouch}
          onScroll={onScroll}
        >
          {COPIES.flatMap((copy) => TEAM.map(({ name, role, photo }, person) => {
            const isClone = copy !== 1;
            const isActive = person === active % N;
            return (
              <li
                key={`${copy}-${name}`}
                aria-hidden={isClone ? 'true' : undefined}
                onMouseEnter={() => setActive(N + person)}
                className={`w-40 shrink-0 snap-center sm:w-[18%] sm:max-w-[13rem] sm:translate-y-[var(--offset)] ${isClone ? 'sm:hidden' : ''}`}
                style={{ '--offset': `${Math.abs(person - middle) * 18}px` }}
              >
                <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl transition-all duration-500 ${isActive ? 'scale-105 shadow-[0_20px_50px_-12px_rgba(5,88,138,0.45)] ring-2 ring-ocean' : 'shadow-md ring-1 ring-fog'}`}>
                  {photo ? (
                    <img src={photo} alt="" loading="lazy" className={`h-full w-full object-cover transition duration-500 ${isActive ? 'saturate-100' : 'opacity-80 saturate-50'}`} />
                  ) : (
                    <span aria-hidden="true" className={`flex h-full w-full items-start justify-center pt-[22%] font-display text-4xl font-bold transition-colors duration-500 ${isActive ? 'bg-gradient-to-br from-mint to-sky text-navy-900/70' : 'bg-gradient-to-b from-mist to-fog text-ocean/50'}`}>
                      {initials(name)}
                    </span>
                  )}
                  <div className={`absolute inset-x-2 bottom-2 rounded-lg border border-white/20 px-3 py-2 text-left backdrop-blur-md transition-colors duration-500 ${isActive ? 'bg-gradient-to-r from-navy-800/90 to-ocean/90' : 'bg-navy-900/55'}`}>
                    <h3 className="text-sm font-semibold leading-tight text-white">{name}</h3>
                    <p className="truncate text-xs text-white/80">{role}</p>
                  </div>
                </div>
              </li>
            );
          }))}
        </ul>
      </div>
    </section>
  );
}
