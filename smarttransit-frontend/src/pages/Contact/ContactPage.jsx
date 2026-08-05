import { useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import FormInput from "../../components/ui/FormInput.jsx";
import Button from "../../components/ui/Button.jsx";
import { MailIcon, PhoneIcon, MapPinIcon, ClockIcon, CheckCircleIcon } from "../../components/Icons.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTACT_DETAILS = [
  { icon: MapPinIcon, label: "Coverage", value: "Serving terminals across Davao Region XI" },
  { icon: PhoneIcon, label: "Phone", value: "(082) 123 4567" },
  { icon: MailIcon, label: "Email", value: "support@smarttransit-davao.ph" },
  { icon: ClockIcon, label: "Support Hours", value: "Monday–Saturday, 6:00 AM – 8:00 PM" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (form.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!EMAIL_PATTERN.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (form.subject.trim().length < 3) nextErrors.subject = "Enter a short subject.";
    if (form.message.trim().length < 10) nextErrors.message = "Message must be at least 10 characters.";
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitted(true);
  };

  return (
    <PublicLayout>
      <section className="bg-navy-900 py-14 sm:py-16">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Contact Us</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            We&apos;re here to help
          </h1>
          <p className="mt-3 max-w-xl text-base text-navy-200">
            Questions about a booking, a route, or a lost item on the bus? Reach out and our team
            will get back to you.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <ul className="space-y-5">
              {CONTACT_DETAILS.map(({ icon: Icon, label, value }) => (
                <li key={label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-navy-950">{value}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
              <MapPinIcon size={22} className="shrink-0 text-teal-600" />
              Serving Ecoland, Tagum, Panabo, Digos, and Mati terminals across Davao Region XI.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            {submitted ? (
              <div className="flex flex-col items-center py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <CheckCircleIcon size={30} />
                </span>
                <h2 className="mt-4 font-display text-xl font-bold text-navy-950">
                  Message sent!
                </h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Thanks for reaching out, {form.name.split(" ")[0]}. Our support team will
                  respond to {form.email} shortly.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({ name: "", email: "", subject: "", message: "" });
                  }}
                >
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInput
                    label="Full Name"
                    required
                    placeholder="Juan Dela Cruz"
                    value={form.name}
                    onChange={handleChange("name")}
                    error={errors.name}
                  />
                  <FormInput
                    label="Email Address"
                    type="email"
                    required
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={handleChange("email")}
                    error={errors.email}
                  />
                </div>
                <FormInput
                  label="Subject"
                  required
                  placeholder="What's this about?"
                  value={form.subject}
                  onChange={handleChange("subject")}
                  error={errors.subject}
                />
                <FormInput
                  as="textarea"
                  label="Message"
                  required
                  rows={5}
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={handleChange("message")}
                  error={errors.message}
                />
                <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
