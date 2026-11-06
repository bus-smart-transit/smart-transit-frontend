import { useState } from 'react';
import FaqAccordionItem from '../../ui/FaqAccordionItem';
import { FAQ_ITEMS } from '../../../utils/faqItems';


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
