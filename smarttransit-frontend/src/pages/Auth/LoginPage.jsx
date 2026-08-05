import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { BusIcon, EyeIcon, EyeOffIcon, InfoIcon, MapPinIcon, ShieldIcon, TicketIcon } from "../../components/Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", rememberMe: true });
  const [error, setError] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleChange = (field) => (event) => {
    const value = field === "rememberMe" ? event.target.checked : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    const result = login(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/");
  };

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
              Your commute, simplified.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-navy-200">
              Sign in to manage your tickets, follow your bus live, and keep track of every
              trip across Davao Region XI.
            </p>
            <ul className="mt-8 space-y-4 text-sm text-navy-100">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <TicketIcon size={18} />
                </span>
                Digital tickets with QR boarding
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <MapPinIcon size={18} />
                </span>
                Live bus tracking on every route
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                  <ShieldIcon size={18} />
                </span>
                Your account, protected and private
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
              Passenger Login
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold text-navy-950">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in to access your trips and tickets.</p>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-teal-50 px-3.5 py-3 text-xs text-teal-800">
              <InfoIcon size={16} className="mt-0.5 shrink-0" />
              <span>
                Demo account: <strong>joshua@example.com</strong> / <strong>Passenger123</strong>
              </span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <FormInput
                label="Email"
                type="email"
                required
                placeholder="you@email.com"
                value={form.email}
                onChange={handleChange("email")}
              />

              <FormInput
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange("password")}
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

              {error && (
                <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={handleChange("rememberMe")}
                    className="h-4 w-4 rounded border-slate-300 text-navy-800 focus:ring-navy-700/30"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="font-semibold text-navy-800 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Button type="submit" variant="primary" className="w-full" size="lg">
                Log In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-semibold text-navy-800 hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => {
          setForgotOpen(false);
          setForgotSent(false);
          setForgotEmail("");
        }}
        title="Reset your password"
      >
        {forgotSent ? (
          <p className="text-sm text-slate-600">
            If an account exists for <strong>{forgotEmail}</strong>, a password reset link has
            been sent. Please check your inbox.
          </p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setForgotSent(true);
            }}
          >
            <p className="text-sm text-slate-600">
              Enter the email linked to your account and we&apos;ll send you a reset link.
            </p>
            <FormInput
              label="Email"
              type="email"
              required
              placeholder="you@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
            />
            <Button type="submit" variant="primary" className="w-full">
              Send Reset Link
            </Button>
          </form>
        )}
      </Modal>
    </PublicLayout>
  );
}
