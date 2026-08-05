import { NEWS_ITEMS } from "../../../data/sampleData.js";
import Card from "../../../components/ui/Card.jsx";
import Button from "../../../components/ui/Button.jsx";
import { ArrowRightIcon } from "../../../components/Icons.jsx";

export default function NewsPreview() {
  const items = NEWS_ITEMS.slice(0, 3);

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">
              Latest News
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold text-navy-950 sm:text-4xl">
              Route updates & announcements
            </h2>
          </div>
          <Button to="/news" variant="outline">
            View All News
            <ArrowRightIcon size={16} />
          </Button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} as="article" className="flex flex-col p-6">
              <span className="inline-flex w-fit items-center rounded-full bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700">
                {item.category}
              </span>
              <time className="mt-3 text-xs font-medium text-slate-400">{item.date}</time>
              <h3 className="mt-2 font-display text-base font-semibold leading-snug text-navy-950">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{item.summary}</p>
              <Button to="/news" variant="ghost" size="sm" className="mt-4 w-fit !px-0 hover:bg-transparent hover:underline">
                Read More
                <ArrowRightIcon size={14} />
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
