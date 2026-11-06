import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useRegion } from '../../../api/hooks/useRegion';
import { provinceCards } from '../../../utils/provinceCards';

function ProvinceCard({ card, tall }) {
  const [broken, setBroken] = useState(false);
  return (
    <a
      href="#search-trips"
      className={`group relative block overflow-hidden rounded-2xl bg-navy-900 ${tall ? 'h-64 sm:h-80' : 'h-56 sm:h-72'}`}
    >
      {!broken && (
        <img
          src={card.image}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/10 to-navy-950/50" aria-hidden="true" />
      <span className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <span className="font-display text-2xl font-bold text-white drop-shadow sm:text-3xl">{card.name}</span>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-navy-900">
          <MapPin size={14} aria-hidden="true" />
          {card.note}
        </span>
      </span>
    </a>
  );
}

/**
 * 2026-11-06 (passenger redesign, joshua-frontend): the provinces of the service region, with photos. Names and
 * towns come from the server's region settings (no place name in the code); a card opens the trip search.
 */
export default function ProvincesSection() {
  const region = useRegion();
  const { provinces, cities } = provinceCards(region?.provinces);
  if (provinces.length === 0 && cities.length === 0) return null;
  const [first, second, ...rest] = provinces;

  return (
    <section className="bg-slate-50 py-16 sm:py-20" aria-labelledby="provinces-heading">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">Where we go</p>
          <h2 id="provinces-heading" className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">Provinces we serve</h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            SmartTransit covers the provinces of {region.name}. Tap one to search for a trip.
          </p>
        </div>

        {first && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <ProvinceCard card={first} tall />
            {second && <ProvinceCard card={second} tall />}
          </div>
        )}
        {rest.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((card) => <ProvinceCard key={card.name} card={card} />)}
          </div>
        )}

        {cities.length > 0 && (
          <>
            <div className="mt-14 max-w-2xl">
              <h3 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">And the city we call home</h3>
            </div>
            <div className="mt-6 grid gap-4">
              {cities.map((card) => <ProvinceCard key={card.name} card={card} tall />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
