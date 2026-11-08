import BookingWidget from "../../../components/BookingWidget.jsx";

export default function Hero({ onSearch }) {
  return (
    <section className="relative bg-white" data-tour="hero">
      <div
        className="relative overflow-hidden rounded-b-[48px] bg-navy-900 bg-cover bg-center"
        style={{ backgroundImage: `url(https://images.pexels.com/photos/1178448/pexels-photo-1178448.jpeg)` }}
      >
        {/* navy overlay so the centered text stays readable on top of the photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/50 via-navy-900/40 to-navy-950/70" />

        <div className="container-page relative flex min-h-[380px] flex-col items-center justify-center pb-32 pt-16 text-center sm:min-h-[460px] sm:pb-40 lg:min-h-[520px]">
          <p className="font-display text-lg font-bold text-white/90 sm:text-3xl">
            Travel across Davao Region
          </p>
          <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none tracking-wide text-white sm:text-7xl lg:text-8xl">
            TRAVEL MADE EASIER
          </h1>
          <p className="mt-5 text-sm font-medium text-white/85 sm:text-base">
            Your destination is just a few clicks away. Search trips and book your next journey online.
          </p>
        </div>
      </div>

      {/* Search card overlaps the bottom edge of the photo */}
      <div className="container-page relative z-10 -mt-24 pb-6 sm:-mt-28 sm:pb-8" data-tour="search-trips">
        <BookingWidget onSearch={onSearch} />
      </div>
    </section>
  );
}
