import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../Layout/Navbar';
import Footer from '../../Layout/Footer';
import FaqAccordionItem from '../../ui/FaqAccordionItem';
import { FAQ_TOPICS, topicId } from '../../../utils/faqItems';

/**
 * 2026-11-07 (passenger redesign, joshua-frontend): the FAQ page. A navy header, the topics in a side list on wide
 * screens, and one card per topic. The questions are the same list as the homepage (utils/faqItems.js).
 */
export default function FaqPage() {
  const [open, setOpen] = useState(null);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <section className="bg-navy-900 py-14 sm:py-16">
          <div className="container-page">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">Help Center</p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Frequently Asked Questions</h1>
            <p className="mt-3 max-w-xl text-base text-navy-200">Quick answers about your account, booking, tickets and tracking.</p>
          </div>
        </section>

        <section className="py-14 sm:py-16">
          <div className="container-page grid gap-8 lg:grid-cols-[220px_1fr]">
            <nav className="hidden lg:block" aria-label="FAQ topics">
              <ul className="sticky top-24 space-y-1 text-sm">
                {FAQ_TOPICS.map(({ topic }) => (
                  <li key={topic}>
                    <a href={`#${topicId(topic)}`} className="block rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-white hover:text-navy-900">{topic}</a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-8">
              {FAQ_TOPICS.map(({ topic, items }) => (
                <section key={topic} id={topicId(topic)} className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-card sm:p-8" aria-labelledby={`${topicId(topic)}-title`}>
                  <h2 id={`${topicId(topic)}-title`} className="font-display text-xl font-semibold text-navy-950">{topic}</h2>
                  <div className="mt-2">
                    {items.map((item) => (
                      <FaqAccordionItem
                        key={item.q}
                        question={item.q}
                        answer={item.a}
                        open={open === item.q}
                        onToggle={() => setOpen((prev) => (prev === item.q ? null : item.q))}
                      />
                    ))}
                  </div>
                </section>
              ))}
              <p className="text-sm text-slate-500">
                Still need help? <Link to="/contact" className="font-semibold text-navy-800 underline">Contact SmartTransit</Link>.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
