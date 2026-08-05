import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";
import { BusIcon, CheckCircleIcon, EyeIcon, EyeOffIcon, GiftIcon, MapPinIcon, TicketIcon } from "../../components/Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^09\d{9}$/;

export default function SignupPage() {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const handleChange = (field) => (event) => {
    const value = field === "terms" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
    if (!EMAIL_PATTERN.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, "")))
      nextErrors.phone = "Enter a valid PH mobile number (e.g. 09171234567).";
    if (form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "Passwords do not match.";
    if (!form.terms) nextErrors.terms = "You must accept the Terms and Conditions.";
    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = register(form);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <PublicLayout>
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <CheckCircleIcon size={36} />
            </span>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-950">Account created!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Welcome to SmartTransit, {form.fullName.split(" ")[0]}. You can now log in with your
              new account to book, track, and manage your trips.
            </p>
            <Button to="/login" variant="primary" size="lg" className="mt-6 w-full">
              Go to Login
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="grid min-h-[calc(100vh-5rem)] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-navy-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 400 400" className="h-full w-full">
              <circle cx="80" cy="80" r="140" fill="white" />
              <circle cx="360" cy="340" r="180" fill="white" />
            </svg>
          </div>
          <Link to="/" className="relative z-10 flex items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <BusIcon size={22} />
            </span>
            <span className="font-display text-lg font-bold">SmartTransit</span>
          </Link>

          <div className="relative z-10 max-w-sm">
            <h2 className="font-display text-3xl font-bold leading-tight text-white">
              Join thousands of daily commuters.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-navy-200">
              Create your free SmartTransit account to reserve seats, pay online, and follow
              your bus in real time.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-navy-100">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <TicketIcon size={18} />
                </span>
                Guaranteed seat reservations
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <MapPinIcon size={18} />
                </span>
                Live GPS bus tracking
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <GiftIcon size={18} />
                </span>
                Earn rewards on every trip
              </li>
            </ul>
          </div>

          <p className="relative z-10 text-xs text-navy-300">
            © {new Date().getFullYear()} SmartTransit. Davao Region XI.
          </p>
        </div>

        <div className="flex items-center justify-center px-4 py-14 sm:px-8">
          <div className="w-full max-w-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
              Passenger Registration
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold text-navy-950">Get started now</h1>
            <p className="mt-2 text-sm text-slate-500">
              Create an account to book, track, and pay for your trips.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <FormInput
                label="Full Name"
                required
                placeholder="Juan Dela Cruz"
                value={form.fullName}
                onChange={handleChange("fullName")}
                error={errors.fullName}
              />
              <FormInput
                label="Email"
                type="email"
                required
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange("email")}
                error={errors.email}
              />
              <FormInput
                label="Phone Number"
                type="tel"
                required
                placeholder="09XX XXX XXXX"
                value={form.phone}
                onChange={handleChange("phone")}
                error={errors.phone}
              />
              <FormInput
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange("password")}
                error={errors.password}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                }
              />
              <FormInput
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                error={errors.confirmPassword}
              />

              <label className="flex items-start gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.terms}
                  onChange={handleChange("terms")}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-800 focus:ring-navy-700/30"
                />
                <span>
                  I agree to the SmartTransit{" "}
                  <span className="font-semibold text-navy-800">Terms and Conditions</span> and{" "}
                  <span className="font-semibold text-navy-800">Privacy Policy</span>.
                </span>
              </label>
              {errors.terms && <p className="text-xs font-medium text-red-600">{errors.terms}</p>}

              {formError && (
                <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                  {formError}
                </p>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full">
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-navy-800 hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
