import { useState, useEffect } from "react";

export function usePublicLayout({
  navLinks = [
    { label: "Home", to: "/" },
    { label: "Routes", to: "#routes" },
    { label: "Features", to: "#features" },
    { label: "About", to: "#about" },
  ],
  loginPath = "/passenger/login",
  signupPath = "/passenger/signup",
} = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Expose a clean event handler function to close the menu explicitly
  const closeMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
    }
  };

  return {
    scrolled,
    menuOpen,
    setMenuOpen,
    closeMenu, // Sent directly to your navigation items
    navLinks,
    loginPath,
    signupPath,
  };
}
