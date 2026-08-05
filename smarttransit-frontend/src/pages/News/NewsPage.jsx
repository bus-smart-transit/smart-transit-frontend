import { useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { NEWS_ITEMS } from "../../data/sampleData.js";
import { ArrowRightIcon } from "../../components/Icons.jsx";

export default function NewsPage() {
  const [activeItem, setActiveItem] = useState(null);

  return (
    <PublicLayout>
      <section className="bg-navy-900 py-14 sm:py-16">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-300">
            SmartTransit News
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            Route updates & announcements
          </h1>
          <p className="mt-3 max-w-xl text-base text-navy-200">
            Stay current on schedule changes, service advisories, and new features across every
            SmartTransit route.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="container-page grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NEWS_ITEMS.map((item) => (
            <Card key={item.id} as="article" className="flex flex-col p-6">
              <span className="inline-flex w-fit items-center rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700">
                {item.category}
              </span>
              <time className="mt-3 text-xs font-medium text-slate-400">{item.date}</time>
              <h2 className="mt-2 font-display text-base font-semibold leading-snug text-navy-950">
                {item.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.summary}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-fit !px-0 hover:bg-transparent hover:underline"
                onClick={() => setActiveItem(item)}
              >
                Read More
                <ArrowRightIcon size={14} />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Modal open={Boolean(activeItem)} onClose={() => setActiveItem(null)} title={activeItem?.category}>
        {activeItem && (
          <div>
            <time className="text-xs font-medium text-slate-400">{activeItem.date}</time>
            <h3 className="mt-1 font-display text-xl font-bold text-navy-950">{activeItem.title}</h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              {activeItem.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </PublicLayout>
  );
}
