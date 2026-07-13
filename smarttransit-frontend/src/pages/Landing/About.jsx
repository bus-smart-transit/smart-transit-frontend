import "./About.css";

const STATS = [
  { value: "5", label: "Terminals across Davao Region XI" },
  { value: "24/7", label: "GPS tracking on active routes" },
  { value: "100%", label: "Online seat reservation" },
];

export default function About() {
  return (
    <section id="about" className="about">
      <div className="container about__grid">
        <div>
          <p className="about__eyebrow">ABOUT SMARTTRANSIT</p>
          <h2 className="about__title">
            Built for commuters travelling across Davao Region XI
          </h2>
          <p className="about__body">
            SmartTransit is a bus transportation management system created as
            a BSIT capstone project, focused on the daily commuting routes
            connecting Davao City to Tagum, Panabo, Digos, and Mati. Instead
            of guessing when the next bus arrives or lining up at a terminal
            window, riders can check live schedules, reserve a seat, and pay
            for their trip before they ever leave the house.
          </p>
          <p className="about__body">
            The goal is simple: make provincial bus travel around the region
            a little less stressful, one route at a time.
          </p>
        </div>

        <div className="about__stats">
          {STATS.map((stat) => (
            <div className="about__stat" key={stat.label}>
              <span className="about__stat-value">{stat.value}</span>
              <span className="about__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
