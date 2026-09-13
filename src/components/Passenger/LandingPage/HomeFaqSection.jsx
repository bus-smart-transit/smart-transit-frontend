import { useState } from 'react';
import FaqAccordionItem from '../../ui/FaqAccordionItem';

const FAQ_ITEMS = [
  { q: 'How do I create a SmartTransit account?', a: 'Click "Sign Up" from the homepage navigation, fill in your details, and verify your email to activate your account.' },
  { q: 'How do I book a trip?', a: 'Use the Search Trips panel on the homepage to find a route and date, then select "Book Seat" on the trip you want.' },
  { q: 'Can I choose my seat?', a: 'Yes — after selecting a trip, choose your preferred seat type (seated or standing) during checkout.' },
  { q: 'How do I pay for my booking?', a: 'Payments are completed online through your chosen payment method (GCash, Maya, or Card) during checkout.' },
  { q: 'Where can I find my digital ticket?', a: 'Once payment is confirmed, your digital ticket is available under "My Tickets" in your account.' },
  { q: 'Where can I find my QR code?', a: 'Your QR code is shown on your digital ticket — open it from My Tickets and present it when boarding.' },
  { q: 'How do I track my bus?', a: 'Use the "Track Bus" page to see live location, ETA, and next stop for active buses.' },
  { q: 'Can I view my previous trips?', a: 'Yes — your Trip History page lists all past bookings, including completed and cancelled trips.' },
  { q: 'How do rewards work?', a: 'You earn SmartPoints for every paid ticket. Once you have enough points, you can redeem them for a discount on future tickets.' },
  { q: 'What should I do if I have a problem with my booking?', a: 'Contact SmartTransit support through the Contact Us page, and include your booking reference if possible.' },
];

export default function HomeFaqSection() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="bg-white px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">FAQ</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl">Frequently Asked Questions</h2>
        <p className="mt-2 text-sm text-slate-500">Quick answers to common questions from SmartTransit passengers.</p>
      </div>

      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white px-5">
        {FAQ_ITEMS.map((item, index) => (
          <FaqAccordionItem
            key={item.q}
            question={item.q}
            answer={item.a}
            open={openIndex === index}
            onToggle={() => setOpenIndex((prev) => (prev === index ? null : index))}
          />
        ))}
      </div>
    </section>
  );
}
