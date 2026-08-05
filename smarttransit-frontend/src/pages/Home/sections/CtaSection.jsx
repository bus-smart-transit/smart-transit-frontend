import Button from "../../../components/ui/Button.jsx";
import { useAuth } from "../../../context/AuthContext.jsx";

export default function CtaSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section className="bg-navy-900 py-16 sm:py-20">
      <div className="container-page flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-xl font-display text-3xl font-bold text-white sm:text-4xl">
          Ready for a smarter commute across Davao Region XI?
        </h2>
        <p className="max-w-lg text-base text-navy-200">
          Search a trip, reserve your seat, and track your bus, all from one account.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
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
    </section>
  );
}
