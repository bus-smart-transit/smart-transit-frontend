import { useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import FaqAccordionItem from "../../components/ui/FaqAccordionItem.jsx";
import Button from "../../components/ui/Button.jsx";
import { FAQ_CATEGORIES } from "../../data/sampleData.js";
import { MailIcon } from "../../components/Icons.jsx";

export default function FaqPage() {
  const [openKey, setOpenKey] = useState("Getting Started-0");

  return (
    <PublicLayout>
      <section className="bg-navy-900 py-14 sm:py-16">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
            Frequently Asked Questions
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Got questions? We&apos;ve got answers.
          </h1>
          <p className="mt-3 max-w-xl text-base text-navy-200">
            Everything you need to know about booking, tracking, tickets, rewards, and your
            SmartTransit account.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-14 sm:py-16">
        <div className="container-page grid gap-8 lg:grid-cols-[220px_1fr]">
          <nav className="hidden lg:block">
            <ul className="sticky top-24 space-y-1 text-sm">
              {FAQ_CATEGORIES.map((group) => (
                <li key={group.category}>
                  <a
                    href={`#${group.category.replace(/\s+/g, "-")}`}
                    className="block rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-white hover:text-navy-900"
                  >
                    {group.category}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-8">
            {FAQ_CATEGORIES.map((group) => (
              <div
                key={group.category}
                id={group.category.replace(/\s+/g, "-")}
                className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-card sm:p-8"
              >
                <h2 className="font-display text-lg font-bold text-navy-950">{group.category}</h2>
                <div className="mt-2">
                  {group.items.map((item, index) => {
                    const key = `${group.category}-${index}`;
                    return (
                      <FaqAccordionItem
                        key={key}
                        question={item.question}
                        answer={item.answer}
                        open={openKey === key}
                        onToggle={() => setOpenKey(openKey === key ? "" : key)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center sm:p-8">
              <p className="font-display text-lg font-semibold text-navy-950">
                Still have a question?
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Our support team is happy to help with anything not covered here.
              </p>
              <Button to="/contact" variant="primary" className="mt-4">
                <MailIcon size={16} />
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
