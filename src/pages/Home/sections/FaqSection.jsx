import { useState } from "react";
import FaqAccordionItem from "../../../components/ui/FaqAccordionItem.jsx";

const FAQ_ITEMS = [
  {
    question: 'How do I create a SmartTransit account?',
    answer:
      'Choose "Log In", then "Sign Up". Fill in your details and enter the code we email you, or choose "Continue with Google".',
  },
  {
    question: 'I forgot my password. What do I do?',
    answer:
      'On the Log In page, choose "Forgot password?" and follow the link we email you.',
  },
  {
    question: 'How do I book a trip?',
    answer:
      'Use the Search Trips panel on the homepage to find a route and date, then select "Book Seat" on the trip you want.',
  },
  {
    question: 'Can I choose my seat?',
    answer:
      'Every online ticket reserves a seat. Standing places are sold only on the bus, by the Chauffeur, once all seats are taken.',
  },
  {
    question: 'How do I pay for my booking?',
    answer:
      'Payments are completed online through your chosen payment method (GCash, Maya, or Card) during checkout.',
  },
  {
    question: 'How do rewards work?',
    answer:
      'You earn SmartPoints for every paid ticket. Once you have enough points, you can redeem them for a discount on future tickets.',
  },
  {
    question: 'Where can I find my digital ticket?',
    answer:
      'Once payment is confirmed, your digital ticket is available under "My Tickets" in your account.',
  },
  {
    question: 'Where can I find my QR code?',
    answer:
      'Your QR code is shown on your digital ticket. Open it from My Tickets and present it when boarding.',
  },
  {
    question: 'Can I view my previous trips?',
    answer:
      'Yes. Your Trip History page lists all past bookings, including completed and cancelled trips.',
  },
  {
    question: 'How do I track my bus?',
    answer:
      'Open the "Track Bus" page to see the live location, arrival time and next stop of running buses. With a booking, use "Track with a booking code".',
  },
  {
    question: 'What should I do if I have a problem with my booking?',
    answer:
      'Contact SmartTransit support through the Contact Us page, and include your booking reference if possible.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <section id="faq" className="scroll-mt-24 bg-white px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">FAQ</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Quick answers to common questions from SmartTransit passengers.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white px-5">
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
    </section>
  );
}
