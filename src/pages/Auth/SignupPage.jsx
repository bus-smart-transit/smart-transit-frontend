import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
} from "../../components/Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import AuthCard from "../../components/auth/AuthCard.jsx";
import GoogleButton from "../../components/auth/GoogleButton.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^09\d{9}$/;

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
];

export default function SignupPage() {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
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

  const validateStepOne = () => {
    const nextErrors = {};
    if (form.fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
    if (!EMAIL_PATTERN.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
    if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, "")))
      nextErrors.phone = "Enter a valid PH mobile number (e.g. 09171234567).";
    return nextErrors;
  };

  const validateStepTwo = () => {
    const nextErrors = {};
    if (!PASSWORD_RULES.every((rule) => rule.test(form.password)))
      nextErrors.password = "Password does not meet all the requirements below.";
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = "Passwords do not match.";
    if (!form.terms) nextErrors.terms = "You must accept the Terms and Conditions.";
    return nextErrors;
  };

  const handleNext = (event) => {
    event.preventDefault();
    const nextErrors = validateStepOne();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep(2);
  };

  const handleBack = () => {
    setErrors({});
    setFormError("");
    setStep(1);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    const nextErrors = validateStepTwo();
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
    <AuthCard
      photoSide="left"
      title={<>Join thousands of<br />daily commuters.</>}
      text="Create your free SmartTransit account to book trips, pay online, and follow your bus in real time."
      tagline="Your journey starts here."
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1 text-xs font-semibold text-navy-700">
        {step === 1 ? "Passenger Registration" : <><ShieldIcon size={14} /> Step 2 of 2</>}
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold text-navy-950">
        {step === 1 ? "Get started now" : "Account Security"}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {step === 1
          ? "Step 1 of 2 — tell us a bit about yourself."
          : "Set a strong password and complete registration."}
      </p>

      {step === 1 ? (
        <form className="mt-6 space-y-4" onSubmit={handleNext} noValidate>
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

          {formError && (
            <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Continue <ArrowRightIcon size={18} />
          </Button>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
          <FormInput
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            placeholder="Create a strong password"
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
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            error={errors.confirmPassword}
          />

          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {PASSWORD_RULES.map((rule) => {
              const passed = rule.test(form.password);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 ${passed ? "text-teal-600" : "text-slate-400"}`}
                >
                  <CheckIcon size={14} />
                  {rule.label}
                </li>
              );
            })}
          </ul>

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

          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={handleBack}>
              <ArrowLeftIcon size={18} /> Back
            </Button>
            <Button type="submit" variant="primary" size="lg" className="flex-1">
              Create Account
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-navy-800 hover:underline">
          Log In
        </Link>
      </p>

      {step === 1 && <GoogleButton onError={setFormError} />}
    </AuthCard>
  );
}
