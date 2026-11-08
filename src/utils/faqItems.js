/**
 * 2026-11-07 (passenger redesign): the one list of passenger questions and answers, by topic. The homepage shows all of
 * them; the FAQ page (/faq) shows them by topic. Every answer describes what SmartTransit really does today.
 */
export const FAQ_TOPICS = [
  {
    topic: 'Your account',
    items: [
      { q: 'How do I create a SmartTransit account?', a: 'Choose "Log In", then "Sign Up". Fill in your details and enter the code we email you, or choose "Continue with Google".' },
      { q: 'I forgot my password. What do I do?', a: 'On the Log In page, choose "Forgot password?" and follow the link we email you.' },
    ],
  },
  {
    topic: 'Booking and payment',
    items: [
      { q: 'How do I book a trip?', a: 'Use the Search Trips panel on the homepage to find a route and date, then select "Book Seat" on the trip you want.' },
      { q: 'Can I choose my seat?', a: 'Every online ticket reserves a seat. Standing places are sold only on the bus, by the Chauffeur, once all seats are taken.' },
      { q: 'How do I pay for my booking?', a: 'Payments are completed online through your chosen payment method (GCash, Maya, or Card) during checkout.' },
      { q: 'How do rewards work?', a: 'You earn SmartPoints for every paid ticket. Once you have enough points, you can redeem them for a discount on future tickets.' },
    ],
  },
  {
    topic: 'Tickets and boarding',
    items: [
      { q: 'Where can I find my digital ticket?', a: 'Once payment is confirmed, your digital ticket is available under "My Tickets" in your account.' },
      { q: 'Where can I find my QR code?', a: 'Your QR code is shown on your digital ticket. Open it from My Tickets and present it when boarding.' },
      { q: 'Can I view my previous trips?', a: 'Yes. Your Trip History page lists all past bookings, including completed and cancelled trips.' },
    ],
  },
  {
    topic: 'Tracking and help',
    items: [
      { q: 'How do I track my bus?', a: 'Open the "Track Bus" page to see the live location, arrival time and next stop of running buses. With a booking, tap "Track my bus" and enter the tracking code on your ticket.' },
      { q: 'What should I do if I have a problem with my booking?', a: 'Contact SmartTransit support through the Contact Us page, and include your booking reference if possible.' },
    ],
  },
];

export const FAQ_ITEMS = FAQ_TOPICS.flatMap((group) => group.items);

export const topicId = (topic) => `faq-${String(topic).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
