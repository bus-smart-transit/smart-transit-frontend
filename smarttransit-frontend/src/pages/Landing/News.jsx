import "./News.css";

// Sample data only — once the backend/admin panel exists, this
// would be fetched from an API instead of hardcoded here.
const NEWS_ITEMS = [
  {
    tag: "Route Update",
    date: "June 3, 2026",
    title: "New Ecoland–Tagum express trip added at 5:30 AM",
    summary:
      "An earlier departure has been added on weekdays to help commuters beat rush hour traffic.",
  },
  {
    tag: "Service Advisory",
    date: "May 28, 2026",
    title: "Panabo route detour due to road repair",
    summary:
      "Buses passing through Panabo will take an alternate route until repairs are completed.",
  },
  {
    tag: "Holiday Schedule",
    date: "May 20, 2026",
    title: "Adjusted trips for the Davao Fiesta holiday",
    summary:
      "Expect fewer trips and higher demand on routes to Mati and Digos during the holiday weekend.",
  },
];

export default function News() {
  return (
    <section id="news" className="news">
      <div className="container">
        <p className="news__eyebrow">LATEST NEWS</p>
        <h2 className="news__title">Route updates & announcements</h2>

        <div className="news__grid">
          {NEWS_ITEMS.map((item) => (
            <article className="news-card" key={item.title}>
              <span className="news-card__tag">{item.tag}</span>
              <time className="news-card__date">{item.date}</time>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
