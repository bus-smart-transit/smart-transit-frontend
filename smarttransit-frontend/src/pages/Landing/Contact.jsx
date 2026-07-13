import { useState } from "react";
import { MapPinIcon } from "../../components/Icons.jsx";
import "./Contact.css";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    // No backend yet — this just confirms the form works.
    // Wire this up to a real endpoint once one exists.
    setSubmitted(true);
  };

  return (
    <section id="contact" className="contact">
      <div className="container contact__grid">
        <div>
          <p className="contact__eyebrow">CONTACT US</p>
          <h2 className="contact__title">We're here to help</h2>
          <p className="contact__body">
            Questions about a booking, a route, or a lost item on the bus?
            Reach out and our team will get back to you.
          </p>

          <ul className="contact__details">
            <li>
              <strong>Coverage</strong>
              <span>Serving terminals across Davao Region XI</span>
            </li>
            <li>
              <strong>Phone</strong>
              <span>(082) 123 4567</span>
            </li>
            <li>
              <strong>Email</strong>
              <span>support@smarttransit-davao.ph</span>
            </li>
            <li>
              <strong>Support Hours</strong>
              <span>Monday–Saturday, 6:00 AM – 8:00 PM</span>
            </li>
          </ul>

          <div className="contact__map">
            <MapPinIcon size={28} />
            <span>Map embed goes here (Google Maps / OpenStreetMap)</span>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Full Name
            <input type="text" name="name" required placeholder="Juan Dela Cruz" />
          </label>
          <label>
            Email Address
            <input type="email" name="email" required placeholder="you@email.com" />
          </label>
          <label>
            Message
            <textarea
              name="message"
              required
              rows={5}
              placeholder="How can we help?"
            />
          </label>
          <button type="submit">Send Message</button>
          {submitted && (
            <p className="contact-form__success">
              Thanks! This is a sample form for now — messages aren't sent
              anywhere yet.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
