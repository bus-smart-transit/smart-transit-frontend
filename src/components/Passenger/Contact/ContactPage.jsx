import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Info, Mail, MapPin, Phone } from 'lucide-react';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import FormInput from '../../ui/FormInput';
import Button from '../../ui/Button';
import { useRegion } from '../../../api/hooks/useRegion';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sample details for the test period (user, 2026-11-07: "This can be mockups"). Replace with the real ones before
// launch; the page says plainly that they are samples.
const SAMPLE_DETAILS = [
  { icon: Phone, label: 'Phone', value: '(082) 123 4567' },
  { icon: Mail, label: 'Email', value: 'support@smarttransit-davao.ph' },
  { icon: Clock, label: 'Support Hours', value: 'Monday to Saturday, 6:00 AM to 8:00 PM' },
];

/**
 * 2026-11-07 (passenger redesign, joshua-frontend): the Contact page, a sample for the test period like the Privacy
 * Policy and Terms. The details are marked as samples and the form does not send anything; after a valid entry it
 * says so and points to the FAQ, instead of claiming the message was sent.
 */
export default function ContactPage() {
  const region = useRegion();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [checked, setChecked] = useState(false);

  const set = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const submit = (event) => {
    event.preventDefault();
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Enter your full name.';
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.subject.trim().length < 3) next.subject = 'Enter a short subject.';
    if (form.message.trim().length < 10) next.message = 'Message must be at least 10 characters.';
    setErrors(next);
    setChecked(Object.keys(next).length === 0);
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <section className="bg-navy-900 py-14 sm:py-16">
          <div className="container-page">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Contact Us</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">We&apos;re here to help</h1>
            <p className="mt-3 max-w-xl text-base text-navy-200">Questions about a booking, a route, or a lost item on the bus? Reach out and our team will get back to you.</p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              <Info className="h-3.5 w-3.5" aria-hidden="true" /> Sample page for the test period
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <ul className="space-y-5">
                {region?.name && (
                  <li className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800"><MapPin size={18} aria-hidden="true" /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Coverage</p>
                      <p className="text-sm font-medium text-navy-950">Serving terminals across {region.name}</p>
                    </div>
                  </li>
                )}
                {SAMPLE_DETAILS.map(({ icon: Icon, label, value }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800"><Icon size={18} aria-hidden="true" /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label} (sample)</p>
                      <p className="text-sm font-medium text-navy-950">{value}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                Most answers are in the <Link to="/faq" className="font-semibold text-navy-800 underline">FAQ</Link>. For a booking, keep your booking reference ready.
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-6 sm:p-8">
              {checked ? (
                <div role="status" className="flex flex-col items-center py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Info size={28} aria-hidden="true" /></span>
                  <h2 className="mt-4 font-display text-xl font-bold text-navy-950">This form is a sample</h2>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">Messages are not sent yet during the test period. Please check the FAQ for help with your booking.</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <Button to="/faq" variant="primary">Open the FAQ</Button>
                    <Button variant="outline" onClick={() => { setChecked(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>Back to the form</Button>
                  </div>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={submit} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormInput label="Full Name" required placeholder="Juan Dela Cruz" value={form.name} onChange={set('name')} error={errors.name} />
                    <FormInput label="Email Address" type="email" required placeholder="you@email.com" value={form.email} onChange={set('email')} error={errors.email} />
                  </div>
                  <FormInput label="Subject" required placeholder="What's this about?" value={form.subject} onChange={set('subject')} error={errors.subject} />
                  <label className="block text-sm">
                    <span className="mb-1.5 block font-medium text-navy-900">Message<span className="ml-1 text-red-500">*</span></span>
                    <textarea
                      rows={5}
                      placeholder="How can we help?"
                      value={form.message}
                      onChange={set('message')}
                      aria-invalid={errors.message ? true : undefined}
                      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-700/30 ${errors.message ? 'border-red-400' : 'border-slate-300 focus:border-navy-700'}`}
                    />
                    {errors.message && <span className="mt-1.5 block text-xs font-medium text-red-600">{errors.message}</span>}
                  </label>
                  <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">Send Message</Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
