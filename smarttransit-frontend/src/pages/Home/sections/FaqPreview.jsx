import { useState } from "react";
import { FAQ_CATEGORIES } from "../../../data/sampleData.js";
import FaqAccordionItem from "../../../components/ui/FaqAccordionItem.jsx";
import Button from "../../../components/ui/Button.jsx";
import { ArrowRightIcon } from "../../../components/Icons.jsx";

const PREVIEW_ITEMS = FAQ_CATEGORIES.flatMap((group) => group.items).slice(0, 4);

export default function FaqPreview() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
            Frequently Asked Questions
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
            Got questions? We&apos;ve got answers.
          </h2>
        </div>

        <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-white p-6 shadow-card sm:p-8">
          {PREVIEW_ITEMS.map((item, index) => (
            <FaqAccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              open={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button to="/faq" variant="outline">
            View All FAQs
            <ArrowRightIcon size={16} />
          </Button>
        </div>
      </div>
    </section>
  );
}
