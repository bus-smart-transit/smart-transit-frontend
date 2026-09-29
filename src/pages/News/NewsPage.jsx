import { useState } from "react";
import PublicLayout from "../../components/PublicLayout.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { NEWS_ITEMS } from "../../data/sampleData.js";
import { ArrowRightIcon } from "../../components/Icons.jsx";

export default function NewsPage() {
  const [activeItem, setActiveItem] = useState(null);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-slate-100 py-14 sm:py-20">
        {/* Decorative brand shape behind the grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-0 hidden h-full w-[38rem] -skew-x-12 rounded-bl-[10rem] bg-navy-800 lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-0 hidden h-full w-40 -skew-x-12 bg-teal-400 lg:block"
        />

        <div className="container-page relative">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-600">
            SmartTransit News
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold uppercase leading-[1.05] tracking-wide text-navy-950 sm:text-5xl">
            Route updates & announcements
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-600">
            Stay current on schedule changes, service advisories, and new features across every
            SmartTransit route.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {NEWS_ITEMS.map((item) => {
              return (
                <article key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveItem(item)}
                    className="group flex h-full w-full flex-col rounded-[1.75rem] p-3 text-left shadow-card ring-1 bg-white ring-slate-200 transition duration-200 hover:-translate-y-1 hover:bg-teal-100 hover:shadow-xl hover:ring-teal-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] bg-slate-200">
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                          {item.category}
                        </span>
                        <time className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 shadow-sm">
                          {item.date}
                        </time>
                      </div>
                    </div>

                    <div className="flex flex-1 items-center gap-4 px-3 pb-3 pt-5">
                      <h2
                        className="flex-1 font-display text-base font-bold uppercase leading-snug tracking-wide text-navy-950"
                      >
                        {item.title}
                      </h2>
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-1 bg-navy-800 text-white"
                      >
                        <ArrowRightIcon size={18} />
                      </span>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <Modal open={Boolean(activeItem)} onClose={() => setActiveItem(null)} title={activeItem?.category}>
        {activeItem && (
          <div>
            <img
              src={activeItem.image}
              alt=""
              className="aspect-[16/9] w-full rounded-xl object-cover"
            />
            <time className="mt-4 block text-xs font-medium text-slate-400">{activeItem.date}</time>
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
