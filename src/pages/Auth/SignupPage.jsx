import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";
import PhoneInput, { formatPhone } from "../../components/ui/PhoneInput.jsx";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  UserIcon,
} from "../../components/Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import AuthCard from "../../components/auth/AuthCard.jsx";
import GoogleButton from "../../components/auth/GoogleButton.jsx";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENDERS = ["Male", "Female", "Prefer not to say"];

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
];

const STRENGTH = [
  { label: "Very weak", color: "#ef4444" },
  { label: "Weak", color: "#f97316" },
  { label: "Fair", color: "#eab308" },
  { label: "Good", color: "#22c55e" },
  { label: "Strong", color: "#16a34a" },
];

// 0-5: one point per rule passed, plus one for a symbol.
function passwordScore(value) {
  if (!value) return 0;
  return PASSWORD_RULES.filter((rule) => rule.test(value)).length + (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
}

const today = () => new Date().toISOString().split("T")[0];

const tealButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

function EyeToggle({ shown, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      className="text-slate-400 transition-colors hover:text-slate-600"
    >
      {shown ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
    </button>
  );
}

export default function SignupPage() {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    callingCode: "+63",
    phone: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    setFormError("");
  };
  const handleChange = (field) => (event) =>
    update(field, field === "terms" ? event.target.checked : event.target.value);

  const validateStepOne = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!EMAIL_PATTERN.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    else if (!formatPhone(form.callingCode, form.phone))
      next.phone =
        form.callingCode === "+63"
          ? "Enter a valid PH mobile number (e.g. 917 123 4567)."
          : "Enter a valid phone number.";
    if (!form.dateOfBirth) next.dateOfBirth = "Date of birth is required.";
    else if (form.dateOfBirth > today()) next.dateOfBirth = "Date of birth can't be in the future.";
    return next;
  };

  const validateStepTwo = () => {
    const next = {};
    if (!PASSWORD_RULES.every((rule) => rule.test(form.password)))
      next.password = "Password does not meet all the requirements below.";
    if (form.confirmPassword !== form.password) next.confirmPassword = "Passwords do not match.";
    if (!form.terms) next.terms = "You must accept the Terms of Service and Privacy Policy.";
    return next;
  };

  const handleNext = (event) => {
    event.preventDefault();
    const next = validateStepOne();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
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
    const next = validateStepTwo();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const result = register({
      fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      email: form.email,
      phone: formatPhone(form.callingCode, form.phone),
      birthdate: form.dateOfBirth,
      gender: form.gender,
      address: form.address,
      password: form.password,
    });
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card motion-safe:animate-fade-up">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600 motion-safe:animate-pop-in">
              <CheckCircleIcon size={36} />
            </span>
            <h1 className="mt-5 font-display text-2xl font-bold text-navy-950">Account created!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Welcome to SmartTransit, {form.firstName.trim()}. You can now log in with your new
              account to book, track, and manage your trips.
            </p>
            <Button to="/login" variant="primary" size="lg" className="mt-6 w-full">
              Go to Login
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const score = passwordScore(form.password);
  const strength = STRENGTH[Math.max(0, score - 1)];

  return (
    <AuthCard wide>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-950">Get started now</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {step === 1
              ? "Step 1 of 2: tell us a bit about yourself."
              : "Step 2 of 2: set a strong password."}
          </p>
        </div>
        <p className="hidden text-sm text-slate-600 md:block">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-navy-800 transition-colors hover:text-navy-700">
            Log In
          </Link>
        </p>
      </div>

      {formError && (
        <p key={formError} role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 motion-safe:animate-shake">
          {formError}
        </p>
      )}

      {step === 1 ? (
        <form className="mt-6 motion-safe:animate-fade-up" onSubmit={handleNext} noValidate>
          <div className="grid gap-x-5 gap-y-4 md:grid-cols-2">
            <FormInput
              label="First Name"
              icon={UserIcon}
              placeholder="Juan"
              autoComplete="given-name"
              value={form.firstName}
              onChange={handleChange("firstName")}
              error={errors.firstName}
            />
            <FormInput
              label="Last Name"
              icon={UserIcon}
              placeholder="Dela Cruz"
              autoComplete="family-name"
              value={form.lastName}
              onChange={handleChange("lastName")}
              error={errors.lastName}
            />
          <FormInput
            label="Email Address"
            type="email"
            icon={MailIcon}
            placeholder="juan@example.com"
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            error={errors.email}
          />
          <PhoneInput
            id="signup-phone"
            label="Phone"
            callingCode={form.callingCode}
            local={form.phone}
            onChange={({ callingCode, local }) => {
              update("callingCode", callingCode);
              update("phone", local);
            }}
            error={errors.phone}
          />
          <FormInput
            label="Date of Birth"
            type="date"
            icon={CalendarIcon}
            max={today()}
            value={form.dateOfBirth}
            onChange={handleChange("dateOfBirth")}
            error={errors.dateOfBirth}
          />
          <FormInput
            as="select"
            label="Gender"
            optional
            value={form.gender}
            onChange={handleChange("gender")}
            className={`cursor-pointer appearance-none ${form.gender ? "" : "text-slate-400"}`}
            rightSlot={<ChevronDownIcon size={16} className="pointer-events-none text-slate-500" />}
          >
            <option value="">Choose (optional)</option>
            {GENDERS.map((g) => (
              <option key={g} value={g} className="text-ink">
                {g}
              </option>
            ))}
          </FormInput>
          <FormInput
            label="Address"
            optional
            icon={MapPinIcon}
            placeholder="House no., street, barangay, city or municipality"
            autoComplete="street-address"
            value={form.address}
            onChange={handleChange("address")}
            containerClassName="md:col-span-2"
          />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button type="submit" className={`${tealButton} w-full md:order-2`}>
              Continue to Security <ArrowRightIcon size={16} />
            </button>
            <GoogleButton divider={false} onError={setFormError} className="rounded-lg md:order-1" />
          </div>
        </form>
      ) : (
        <form className="mt-6 space-y-5 motion-safe:animate-fade-up" onSubmit={handleSubmit} noValidate>
          <div className="grid items-start gap-x-5 gap-y-4 md:grid-cols-2">
          <div>
            <FormInput
              label="Password"
              type={showPassword ? "text" : "password"}
              icon={LockIcon}
              placeholder="Create a strong password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange("password")}
              error={errors.password}
              rightSlot={
                <EyeToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} label="password" />
              }
            />
            {form.password && (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Strength</span>
                  <span style={{ color: strength.color }}>{strength.label}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="h-1.5 rounded transition-colors duration-300"
                      style={{ background: n <= score ? strength.color : "#e2e8f0" }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <FormInput
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            icon={LockIcon}
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange("confirmPassword")}
            error={errors.confirmPassword}
            rightSlot={
              <EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />
            }
          />
          </div>

          <ul className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
            {PASSWORD_RULES.map((rule) => (
              <li
                key={rule.label}
                className={`flex items-center gap-2 transition-colors ${
                  rule.test(form.password) ? "text-teal-600" : "text-slate-400"
                }`}
              >
                <CheckIcon size={14} />
                {rule.label}
              </li>
            ))}
          </ul>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={handleChange("terms")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="font-medium text-teal-600 hover:text-teal-700">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="font-medium text-teal-600 hover:text-teal-700">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.terms && <p className="-mt-2 text-xs font-medium text-red-600">{errors.terms}</p>}

          <div className="flex gap-3 md:justify-end">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
            >
              <ArrowLeftIcon size={16} /> Back
            </button>
            <button type="submit" className={`${tealButton} flex-1 md:w-56 md:flex-none`}>
              Create Account
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-600 md:hidden">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-navy-800 transition-colors hover:text-navy-700">
          Log In
        </Link>
      </p>

    </AuthCard>
  );
}
