import { useState } from "react";
import FaqAccordionItem from "../../../components/ui/FaqAccordionItem.jsx";

const FAQ_ITEMS = [
  {
    question: "How do I create a SmartTransit account?",
    answer:
      "Select Log In, then Create Account, and enter your name, email, and phone number. You can start booking trips as soon as your account is set up.",
  },
  {
    question: "How do I book a trip?",
    answer:
      "Search for your origin, destination, and travel date in the Search Trips section, then choose a schedule, pick a seat, and complete payment.",
  },
  {
    question: "Can I choose my seat?",
    answer:
      "Yes. After selecting a schedule, you'll see a seat map where you can pick any available seat before paying.",
  },
  {
    question: "How do I pay for my booking?",
    answer:
      "Bookings are paid online through GCash. Your reservation is confirmed as soon as payment goes through.",
  },
  {
    question: "Where can I find my digital ticket?",
    answer:
      "Open My Tickets from your account menu. Every confirmed booking appears there with its full ticket details.",
  },
  {
    question: "Where can I find my QR code?",
    answer:
      "Your QR code is part of your digital ticket in My Tickets. Open the ticket for your trip to view it.",
  },
  {
    question: "How do I track my bus?",
    answer:
      "Go to Track Bus to see your bus's current stop, next stop, and estimated arrival time.",
  },
  {
    question: "Can I view my previous trips?",
    answer:
      "Yes. Trip History keeps a record of every trip you've taken, including fare and payment details.",
  },
  {
    question: "How do rewards work?",
    answer:
      "You earn points on every trip you book. Check the Rewards page to see your points balance and what you can redeem them for.",
  },
  {
    question: "What should I do if I have a problem with my booking?",
    answer:
      "Check the FAQ page for common issues, or reach out through Contact Us and our support team will help.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">FAQ</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-slate-500">
            Quick answers to common questions from SmartTransit passengers.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          {FAQ_ITEMS.map((item, index) => (
            <FaqAccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
