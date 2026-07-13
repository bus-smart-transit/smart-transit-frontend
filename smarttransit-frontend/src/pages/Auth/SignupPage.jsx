import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserIcon, EyeIcon, EyeOffIcon } from "../../components/Icons.jsx";
import AuthTopBar from "../../components/AuthTopBar.jsx";
import "./Auth.css";

export default function SignupPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    // No backend yet — registering just takes the passenger to
    // the dashboard, the same way it will once auth is wired up.
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <AuthTopBar />

      <div className="auth-page__body">
        <div className="auth-card auth-card--wide">
          <span className="auth-card__tag">
            <UserIcon size={18} />
            Passenger
          </span>
          <h1>Get Started Now!</h1>
          <p className="auth-card__subtitle">
            Create an account to book, track, and pay for your trips.
          </p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-form__row">
              <label>
                First Name
                <input type="text" required placeholder="Juan" />
              </label>
              <label>
                Last Name
                <input type="text" required placeholder="Dela Cruz" />
              </label>
            </div>

            <label>
              Email
              <input type="email" required placeholder="you@email.com" />
            </label>

            <div className="auth-form__row">
              <label>
                Birth Of Date
                <input type="date" required />
              </label>
              <label>
                Phone Number
                <input type="tel" required placeholder="09XX XXX XXXX" />
              </label>
            </div>

            <label>
              Set Password
              <div className="auth-form__password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  className="auth-form__toggle-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>

            <label>
              Confirm Password
              <input type="password" required placeholder="Re-enter your password" />
            </label>

            <button type="submit">Register</button>
          </form>

          <p className="auth-card__footer">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
