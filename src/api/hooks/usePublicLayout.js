import { useState, useEffect } from "react";
import { useAuthRole } from "./useAuth";

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

  const { isAuthenticated, isLoading } = useAuthRole();

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
