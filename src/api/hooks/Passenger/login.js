import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PassengerService from "../../../api/PassengerService/PassengerService";
import { useAuth } from "../../../api/hooks/useAuth"; // adjust path

export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

  // OTP stage
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpUserId, setOtpUserId] = useState(null);
  const [otpEmailMasked, setOtpEmailMasked] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    setError("");
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    return e;
  };

  // Step 1 — credentials → triggers OTP email
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await PassengerService.login({
        email: form.email,
        password: form.password,
      });

      const data = response?.data;

      if (data?.otp_required) {
        setOtpUserId(data.user_id);
        setOtpEmailMasked(data.email_masked ?? "your email");
        setOtpRequired(true);
      } else {
        // Fallback: if server somehow returns a token directly
        const token = data?.token;
        if (!token) throw new Error("Authentication token missing from server response.");
        login(token, rememberMe);
        navigate("/passenger/dashboard");
      }
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 — OTP submission
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const cleaned = otp.trim();
    if (cleaned.length !== 6 || !/^\d{6}$/.test(cleaned)) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }

    setIsLoading(true);
    setOtpError("");
    try {
      const response = await PassengerService.verifyOtp(otpUserId, cleaned);
      const token = response?.data?.token;
      if (!token) throw new Error("Token missing after OTP verification.");
      login(token, rememberMe);
      navigate("/passenger/dashboard");
    } catch (err) {
      setOtpError(err?.message || "Incorrect or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // Re-run step 1 with the same credentials (user already typed them)
    setOtpError("");
    setOtp("");
    setIsLoading(true);
    try {
      await PassengerService.login({ email: form.email, password: form.password });
    } catch {
      // Silently ignore — the OTP screen stays open
    } finally {
      setIsLoading(false);
    }
  };

  const cancelOtp = () => {
    setOtpRequired(false);
    setOtpUserId(null);
    setOtpEmailMasked("");
    setOtp("");
    setOtpError("");
  };

  return {
    form,
    errors,
    error,
    isLoading,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    update,
    handleSubmit,
    // OTP
    otpRequired,
    otp,
    setOtp,
    otpError,
    otpEmailMasked,
    handleVerifyOtp,
    handleResendOtp,
    cancelOtp,
  };
}

