import Button from '../../ui/Button';

export default function NeedHelpSection() {
  return (
    <section className="bg-navy-950 px-4 py-14 text-center sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">Need help with your trip?</h2>
        <p className="mt-2 text-sm text-slate-300">Check our FAQs or contact us if you need assistance.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href="#faq" variant="accent" size="md">
            View FAQ
          </Button>
          <Button to="/contact" variant="outline" size="md" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
            Contact Us
          </Button>
        </div>
      </div>
    </section>
  );
}
