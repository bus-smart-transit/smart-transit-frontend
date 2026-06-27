import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PassengerService from "../../../api/PassengerService/PassengerService";

const STRENGTH_INFO = [
  { label: "", color: "transparent" },
  { label: "Very Weak", color: "#ef4444" },
  { label: "Weak", color: "#f97316" },
  { label: "Fair", color: "#eab308" },
  { label: "Strong", color: "#22c55e" },
  { label: "Very Strong", color: "#06b6d4" },
];

const getStrength = (pwd) => {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z\d]/.test(pwd)) score++;
  return score;
};

export function useSignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 2-step form
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    setError("");
  };

  /* ── Validation ── */
  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required";
    if (!form.lastName.trim()) e.lastName = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone))
      e.phone = "Enter a valid phone number";
    if (!form.dateOfBirth) e.dateOfBirth = "Date of birth is required";
    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8)
      e.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password))
      e.password = "Must include uppercase, lowercase, and a number";

    if (!form.confirmPassword)
      e.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";

    if (!form.agreeTerms)
      e.agreeTerms = "You must accept the Terms & Conditions";
    return e;
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      // FIX: Map your frontend state fields to match Laravel's specific database columns
      await PassengerService.register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`, // Combines into 'name'
        email: form.email,
        phone_num: form.phone, // Maps 'phone' to 'phone_num'
        birthdate: form.dateOfBirth, // Maps 'dateOfBirth' to 'birthdate'
        address: form.address,
        password: form.password,
        password_confirmation: form.confirmPassword, // Always good practice for Laravel validation
      });

      setSuccess("Account created! Redirecting to login…");
      setTimeout(() => navigate("/passenger/login"), 2000);
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Password strength ── */
  const strength = getStrength(form.password);
  const si = STRENGTH_INFO[strength] || STRENGTH_INFO[0];

  return {
    step,
    setStep,
    isLoading,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    error,
    success,
    form,
    errors,
    update,
    handleStep1,
    handleSubmit,
    strength,
    si,
  };
}
