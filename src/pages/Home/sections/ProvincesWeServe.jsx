import { MapPinIcon } from "../../../components/Icons.jsx";

// The five provinces of the Davao Region (XI), each with the main terminal
// we serve there. Photos live in public/images/destinations (Wikimedia Commons).
const PROVINCES = [
  {
    province: "Davao de Oro",
    terminal: "Nabunturan",
    image: "/images/destinations/davao-de-oro.jpg",
  },
  {
    province: "Davao del Norte",
    terminal: "Tagum",
    image: "/images/destinations/davao-del-norte.jpg",
  },
  {
    province: "Davao del Sur",
    terminal: "Digos",
    image: "/images/destinations/davao-del-sur.jpg",
  },
  {
    province: "Davao Oriental",
    terminal: "Mati",
    image: "/images/destinations/davao-oriental.jpg",
  },
  {
    province: "Davao Occidental",
    terminal: "Malita",
    image: "/images/destinations/davao-occidental.jpg",
  },
];

// Davao City is a highly urbanized city, not a province, so it gets its own
// card below the provinces grid.
const DAVAO_CITY = {
  province: "Davao City",
  terminal: "Highly urbanized city",
  image: "/images/destinations/davao-city.jpg",
};

function ProvinceCard({ province, terminal, image, tall }) {
  return (
    <div
      className={`group relative block overflow-hidden rounded-2xl bg-navy-950 ${
        tall ? "h-64 sm:h-80" : "h-56 sm:h-72"
      }`}
    >
      <img
        src={image}
        alt={province}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/10 to-navy-950/50" />
      <span className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <span className="font-display text-2xl font-bold text-white drop-shadow sm:text-3xl">{province}</span>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-navy-900 backdrop-blur">
          <MapPinIcon size={14} />
          {terminal}
        </span>
      </span>
    </div>
  );
}

export default function ProvincesWeServe() {
  const [first, second, ...rest] = PROVINCES;

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Where we go
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Provinces we serve
          </h2>
          <p className="mt-3 text-base leading-relaxed text-slate-500">
            SmartTransit covers the provinces of Davao Region.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <ProvinceCard {...first} tall />
          <ProvinceCard {...second} tall />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <ProvinceCard key={p.province} {...p} />
          ))}
        </div>

        <div className="mt-14 max-w-2xl">
          <h3 className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            And the city we call home
          </h3>
        </div>
        <div className="mt-6">
          <ProvinceCard {...DAVAO_CITY} tall />
        </div>
      </div>
    </section>
  );
}
