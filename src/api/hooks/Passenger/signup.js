import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PassengerService from "../../../api/PassengerService/PassengerService";
// Batch 46: the same field rules as the Operator's Add Staff form (utils/accountFormRules.js).
import {
  STRENGTH_INFO,
  passwordStrength as getStrength,
  nameErrors,
  emailError,
  birthDateError,
  passwordError,
  confirmPasswordError,
  compactErrors,
  LOOSE_PHONE_PATTERN,
} from "../../../utils/accountFormRules";

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
    gender: "",
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
    const e = { ...nameErrors(form), email: emailError(form.email) };
    // The calling-code phone field arrives with Batch 47 part B; until then sign-up keeps its plain phone check.
    if (!form.phone.trim()) e.phone = "Phone number is required";
    else if (!LOOSE_PHONE_PATTERN.test(form.phone))
      e.phone = "Enter a valid phone number";
    if (!form.dateOfBirth) e.dateOfBirth = birthDateError(form.dateOfBirth);
    return compactErrors(e);
  };

  const validateStep2 = () => {
    const e = {
      password: passwordError(form.password),
      confirmPassword: confirmPasswordError(form.password, form.confirmPassword),
    };
    if (!form.agreeTerms)
      e.agreeTerms = "You must accept the Terms & Conditions";
    return compactErrors(e);
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
      const response = await PassengerService.register({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`, // Combines into 'name'
        email: form.email,
        phone_num: form.phone, // Maps 'phone' to 'phone_num'
        birthdate: form.dateOfBirth, // Maps 'dateOfBirth' to 'birthdate'
        gender: form.gender || null, // 2026-10-28: optional
        address: form.address,
        password: form.password,
        password_confirmation: form.confirmPassword, // Always good practice for Laravel validation
      });

      // 2026-10-28: the account is verified by a code emailed now; the login page opens on the code screen.
      const data = response?.data ?? {};
      setSuccess("Account created! Check your email for the code to verify it.");
      setTimeout(() => navigate("/passenger/login", {
        state: data.verification_required
          ? { verifyEmail: { accountUuid: data.account_uuid, emailMasked: data.email_masked, email: form.email.trim().toLowerCase() } }
          : undefined,
      }), 1500);
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
