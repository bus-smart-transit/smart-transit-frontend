import { BusIcon } from "./Icons.jsx";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <div className="footer__logo">
            <BusIcon size={28} />
            <span>SmartTransit</span>
          </div>
          <p>
            A student capstone project bringing real-time bus booking and
            tracking to commuters across Davao Region XI.
          </p>
        </div>

        <div className="footer__column">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#news">News</a></li>
            <li><a href="#faq">FAQ</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
        </div>

        <div className="footer__column">
          <h4>Contact</h4>
          <ul>
            <li>Serving Davao Region XI</li>
            <li>(082) 123 4567</li>
            <li>support@smarttransit-davao.ph</li>
          </ul>
        </div>
      </div>

      <div className="footer__bottom container">
        <p>© {new Date().getFullYear()} SmartTransit. All rights reserved.</p>
      </div>
    </footer>
  );
}
