import { TriangleAlert } from 'lucide-react';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import { useRegion } from '../../../api/hooks/useRegion';

// 2026-11-06: SAMPLE Privacy Policy and Terms of Service for the test period (decided by the user: a mock-up for now).
// The privacy text lists only what SmartTransit really collects and does today. It is not legal advice and must be
// replaced by text approved by the project's advisers before real use.

const DOCUMENTS = {
  privacy: {
    title: 'Privacy Policy',
    sections: [
      {
        heading: 'What we collect',
        items: [
          'Your name, email address, phone number and date of birth when you sign up. Gender and address are optional.',
          'Your bookings, tickets and payment records (amount, status and reference).',
          'Payment card and e-wallet details are entered on PayMongo\'s page. SmartTransit does not see or keep them.',
          'Your location only when you choose "Pin My Location". It stays on your device to find buses near you; it is not sent to us.',
          'For Drivers: the bus position from the Driver\'s phone during a trip, so passengers can track the bus.',
        ],
      },
      {
        heading: 'Why we use it',
        items: [
          'To create your account and send your login and verification codes.',
          'To sell, show and check your tickets, and to refund a cancelled trip.',
          'To show where your bus is and when it should arrive.',
          'To keep the service safe, for example by limiting repeated sign-in attempts.',
        ],
      },
      {
        heading: 'Who can see it',
        items: [
          'The bus company that runs your trip sees what it needs to serve you, such as your ticket and seat.',
          'Each bus company sees only its own staff, buses and trips.',
          'We do not sell your data.',
        ],
      },
      {
        heading: 'How long we keep it',
        items: [
          'You can delete your account from your profile. After 7 days your personal details are erased.',
          'Ticket and payment records are kept without your name, because the bus company needs them for its accounts.',
        ],
      },
      {
        heading: 'Your rights',
        items: [
          'Under the Philippine Data Privacy Act of 2012 you may ask to see, correct or delete your personal data.',
          'Contact: Not provided yet (sample text).',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    sections: [
      {
        heading: 'Using SmartTransit',
        items: [
          'SmartTransit helps you find buses, buy tickets and track your bus in {region}.',
          'Give true details when you sign up, and keep your password to yourself.',
        ],
      },
      {
        heading: 'Tickets and payment',
        items: [
          'A ticket is for the trip, seat type and stops shown on it.',
          'During the test period, online payments use PayMongo\'s test mode: no real money is charged.',
          'The bus company decides the fares. The booking fee is shown before you pay.',
        ],
      },
      {
        heading: 'Cancelled trips',
        items: [
          'If the bus company cancels your trip, you can choose a refund or another trip, as shown on your ticket.',
        ],
      },
      {
        heading: 'Test period',
        items: [
          'SmartTransit is being tested. Times, buses and arrival estimates may be wrong, and the service may stop without notice.',
        ],
      },
    ],
  },
};

export default function LegalPage({ kind }) {
  const doc = DOCUMENTS[kind] ?? DOCUMENTS.privacy;
  // The region name comes from the server (no place names in the code).
  const region = useRegion();
  const fill = (text) => text.replace('{region}', region?.name || 'your region');
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl text-slate-950">{doc.title}</h1>
        <div role="note" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="legal-sample-note">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Sample text for the test period. It is not the final legal text and will be replaced before SmartTransit is used for real.</p>
        </div>
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="font-display text-lg font-semibold text-slate-900">{section.heading}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              {section.items.map((item) => <li key={item}>{fill(item)}</li>)}
            </ul>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}
