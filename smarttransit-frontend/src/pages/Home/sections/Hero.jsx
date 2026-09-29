import BookingWidget from "../../../components/BookingWidget.jsx";

export default function Hero({ onSearch }) {
  return (
    <section className="relative bg-white">
      <div
        className="relative overflow-hidden rounded-b-[48px] bg-navy-900 bg-cover bg-center"
        style={{ backgroundImage: `url(https://images.pexels.com/photos/1178448/pexels-photo-1178448.jpeg)` }}
      >
        {/* navy overlay so the centered text stays readable on top of the photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/50 via-navy-900/40 to-navy-950/70" />

        <div className="container-page relative flex min-h-[420px] flex-col items-center justify-center pb-36 pt-20 text-center sm:min-h-[480px] sm:pb-40 lg:min-h-[540px]">
          <p className="font-display text-xl font-medium text-white/90 sm:text-3xl">
            Travel across Davao Region XI
          </p>
          <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none tracking-wide text-white sm:text-7xl lg:text-8xl">
            Ride Smarter
          </h1>
          <p className="mt-5 text-sm font-medium text-white/85 sm:text-base">
            Book your seat, track your bus, and arrive on time.
          </p>
        </div>
      </div>

      {/* Search card overlaps the bottom edge of the photo */}
      <div className="container-page relative z-10 -mt-24 pb-6 sm:-mt-28 sm:pb-8">
        <BookingWidget onSearch={onSearch} />
      </div>
    </section>
  );
}
