import { useState, useEffect } from "react";

export function usePublicLayout({
  navLinks = [
    { label: "Home", to: "/" },
    { label: "Routes", to: "#routes" },
    { label: "Features", to: "#features" },
    { label: "About", to: "#about" },
  ],
  loginPath = "/passenger/dashboard",
  signupPath = "/passenger/signup",
} = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── FIX: Synchronously initialize state to avoid cascading renders ──
  const [isAuthenticated] = useState(() => {
    const token =
      localStorage.getItem("passenger_token") ||
      sessionStorage.getItem("passenger_token");
    return !!token;
  });

  // Since we initialize it correctly on line 17, loading is done immediately
  const [isLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => {
    if (menuOpen) setMenuOpen(false);
  };

  return {
    scrolled,
    menuOpen,
    setMenuOpen,
    closeMenu,
    navLinks,
    loginPath,
    signupPath,
    isAuthenticated,
    isLoading,
  };
}
