import Button from "../../../components/ui/Button.jsx";
import BookingWidget from "../../../components/BookingWidget.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function Hero({ onSearch }) {
  const { isAuthenticated } = useAuth();

  return (
    <section
      className="relative overflow-hidden rounded-b-[48px] bg-navy-900 bg-cover bg-center"
      style={{ backgroundImage: `url(https://images.pexels.com/photos/1178448/pexels-photo-1178448.jpeg)` }}
    >
      {/* dark navy overlay so text stays readable on top of the photo */}
      <div className="absolute inset-0 bg-navy-900/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/40 via-navy-900/60 to-navy-900/85" />

      <div className="container-page relative py-16 lg:py-24">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-teal-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
          </span>
          Real-Time GPS Active
        </span>

        <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
          Ride smarter,
          <br />
          arrive on time.
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-navy-100 sm:text-lg">
          Track your bus, manage your trips, access your tickets, and enjoy a smarter public
          transit experience across Davao Region XI.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <Button to="/dashboard" variant="accent" size="lg">
              Go to Dashboard
            </Button>
          ) : (
            <Button to="/signup" variant="accent" size="lg">
              Get Started
            </Button>
          )}
          <Button to="/track-bus" variant="white" size="lg">
            Track a Bus
          </Button>
        </div>
      </div>

      <div className="container-page relative pb-16 lg:pb-24">
        <BookingWidget onSearch={onSearch} />
      </div>
    </section>
  );
}