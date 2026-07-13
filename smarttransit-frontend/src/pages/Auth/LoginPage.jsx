import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserIcon, EyeIcon, EyeOffIcon } from "../../components/Icons.jsx";
import AuthTopBar from "../../components/AuthTopBar.jsx";
import "./Auth.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    // No backend yet — signing in just takes the passenger to
    // the dashboard, the same way it will once auth is wired up.
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <AuthTopBar />

      <div className="auth-page__body">
        <div className="auth-card">
          <span className="auth-card__tag">
            <UserIcon size={18} />
            Passenger
          </span>
          <h1>Welcome back!</h1>
          <p className="auth-card__subtitle">Sign in to access your trips.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input type="email" required placeholder="you@email.com" />
            </label>

            <label>
              Password
              <div className="auth-form__password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
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

            <div className="auth-form__meta-row">
              <Link to="/login">Forgot Password?</Link>
            </div>

            <button type="submit">Log In</button>
          </form>

          <p className="auth-card__footer">
            Not have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
