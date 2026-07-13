import { useState } from "react";
import "./Faq.css";

const FAQ_ITEMS = [
  {
    question: "Which routes does SmartTransit currently cover?",
    answer:
      "Trips connecting Davao City (Ecoland Terminal) to Tagum, Panabo, Digos, and Mati terminals across Davao Region XI.",
  },
  {
    question: "How do I pay for my seat?",
    answer:
      "Bookings are paid online through GCash. Once payment is confirmed, your e-ticket and QR code appear in your account right away.",
  },
  {
    question: "Can I track my bus before it arrives?",
    answer:
      "Yes. Once you've booked a trip, you can open Track Bus to see your bus's live location on the map.",
  },
  {
    question: "What if I need to cancel or change my trip?",
    answer:
      "You can view and manage upcoming trips from your dashboard. Cancellation policies will be shown before you confirm a change.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="faq">
      <div className="container">
        <p className="faq__eyebrow">FREQUENTLY ASKED QUESTIONS</p>
        <h2 className="faq__title">Got questions? We've got answers.</h2>

        <div className="faq__list">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div className="faq-item" key={item.question}>
                <button
                  className="faq-item__question"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  {item.question}
                  <span className="faq-item__toggle">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <p className="faq-item__answer">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
