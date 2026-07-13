import { useState } from "react";
import { Link } from "react-router-dom";
import { BusIcon, MenuIcon, CloseIcon } from "./Icons.jsx";
import "./Navbar.css";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "News", href: "#news" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact Us", href: "#contact" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Smooth-scrolls to a section instead of a hard page jump.
  const handleNavClick = (event, href) => {
    event.preventDefault();
    setMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <button
          className="navbar__menu-btn"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <a href="#home" className="navbar__brand" onClick={(e) => handleNavClick(e, "#home")}>
          <BusIcon size={32} />
          <span>SmartTransit</span>
        </a>

        <nav className={`navbar__links ${menuOpen ? "navbar__links--open" : ""}`}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
            </a>
          ))}
          {/* Login page comes later — link is wired up but the route isn't built yet */}
          <Link to="/login" className="navbar__login">
            Log In
          </Link>
        </nav>
      </div>
    </header>
  );
}
