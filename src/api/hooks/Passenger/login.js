import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PassengerService from "../../../api/PassengerService/PassengerService";
import { useAuth } from "../../../api/hooks/useAuth"; // adjust path

export function useLogin() {
  const navigate = useNavigate();
  const { login } = useAuth(); // ← pull login from context
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});

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

      const token = response?.data?.token;
      if (!token) {
        throw new Error("Authentication token missing from server response.");
      }

      login(token, rememberMe); // ← updates AuthProvider's state, triggers re-render
      navigate("/passenger/dashboard");
    } catch (err) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
  };
}
