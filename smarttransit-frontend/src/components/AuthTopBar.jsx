import { Link } from "react-router-dom";
import { BusIcon } from "./Icons.jsx";
import "./AuthTopBar.css";

export default function AuthTopBar() {
  return (
    <header className="auth-topbar">
      <div className="container auth-topbar__inner">
        <Link to="/" className="auth-topbar__brand">
          <BusIcon size={30} />
          <span>SmartTransit</span>
        </Link>
        <nav className="auth-topbar__links">
          <Link to="/">Home</Link>
          <a href="/#contact">Contact Us</a>
        </nav>
      </div>
    </header>
  );
}
