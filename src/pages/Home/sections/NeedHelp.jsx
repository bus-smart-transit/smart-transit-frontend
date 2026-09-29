import Button from "../../../components/ui/Button.jsx";

export default function NeedHelp() {
  return (
    <section className="bg-navy-900 py-16 sm:py-20">
      <div className="container-page flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-lg font-display text-3xl font-bold text-white sm:text-4xl">
          Need help with your trip?
        </h2>
        <p className="max-w-md text-base text-navy-200">
          Check our FAQs or contact us if you need assistance.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button to="/faq" variant="accent" size="lg">
            View FAQ
          </Button>
          <Button to="/contact" variant="white" size="lg">
            Contact Us
          </Button>
        </div>
      </div>
    </section>
  );
}
