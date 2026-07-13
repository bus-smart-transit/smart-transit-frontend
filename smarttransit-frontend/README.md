# SmartTransit — Frontend (Passenger Website)

BSIT capstone project: a bus transportation management system for Davao
Region XI. This is the frontend only, built with React + Vite.

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

## What's built

- **Landing Page** (`/`) — Hero (with a custom SVG illustration) + search
  widget, Why Choose SmartTransit (6 feature cards), About, Latest News
  (sample), FAQ accordion, Contact form, Footer. Nav links smooth-scroll
  to each section.
- **Login / Sign Up** — matches the simpler of the two Figma login
  variants (no Remember Me), plus the full registration form.
- **Dashboard** (`/dashboard`) — sidebar layout with stat cards, upcoming
  trip, recent bookings, quick actions, active routes, and announcements.
  No "Book a Seat" widget here anymore (moved to Quick Actions instead).
- **My Tickets** (`/my-tickets`) — sample booked tickets (booking ID, bus
  operator, origin/destination, departure, seat, status) that expand to
  show full details + a QR code.
- **Trip History** (`/trip-history`) — sample past trips with date,
  route, operator, seat, payment status, and trip status, expandable
  for fare/payment details.
- **Rewards** (`/rewards`) — points balance + tier progress, available
  rewards to redeem, earned badges, and redemption history.
- **Track Bus** (`/track-bus`) — simulated live GPS marker moving along
  a sample route using plain SVG (no map API key required to demo it).
- **Booking flow**: search results → seat map → payment confirmation
  (GCash) → GCash placeholder → confirmed e-ticket with QR.

## Folder structure

```
src/
  main.jsx                    — React + Router + BookingProvider entry point
  App.jsx                     — every route in the app, grouped by section
  context/
    BookingContext.jsx        — shared state for the booking flow
  data/
    sampleData.js             — all sample/demo data in one place
  styles/
    variables.css             — color/font/spacing tokens pulled from Figma
    global.css                 — reset + base element styles
  components/                  — reused across multiple pages
    Icons.jsx                   — small inline SVG icons (no icon package)
    HeroIllustration.jsx         — the landing page's hero SVG illustration
    Navbar.jsx / .css
    AuthTopBar.jsx / .css
    AppTopBar.jsx / .css
    DashboardLayout.jsx / .css    — sidebar layout (Dashboard, My Tickets,
                                    Trip History, Track Bus, Rewards)
    Footer.jsx / .css
    BookingWidget.jsx / .css
    QrPlaceholder.jsx
  pages/
    Landing/
    Auth/
    Dashboard/
    MyTickets/
    TripHistory/
    Rewards/
    Booking/
    TrackBus/
    ComingSoonPage.jsx          — placeholder only for /profile now
```

## Notes on this round of changes

- **Sidebar updated to match your latest Figma**: "Payment Method" is
  now "Rewards", and the bottom section is "Profile" + "Logout" (no
  more "Settings" link) — matching the nav labels in your updated
  Dashboard frame.
- **Dashboard**: removed the "Book a Seat" card per your request.
  Booking is still reachable from Quick Actions → "Book a New Trip".
- **My Tickets, Trip History, Rewards**: fully built out — no more
  "This page isn't built yet" placeholders anywhere in the app.
- **About the new reference photos in your Figma file**: I noticed a
  few new image frames were added, but my build environment has no
  internet access, so I couldn't download the actual photo files from
  Figma's asset server. Instead, I added a custom SVG illustration to
  the hero section using your site's exact color palette, so the page
  still gets real visual interest without a placeholder-looking gap.
  **If you want your actual photos in the site**, upload them to me
  directly (as image attachments) in a future message, or drop them
  into `src/assets/` yourself and reference them from `Hero.css` /
  `About.jsx` — I can wire that up in one more pass.
- **Colors and fonts** still live in `src/styles/variables.css` — reuse
  those tokens for any future pages so everything stays consistent.
- **Sample data**: everything demo-related lives in
  `src/data/sampleData.js`, including the new tickets, trip history,
  and rewards datasets. Replace with real API calls once a backend
  exists.

## Not built yet

- Profile page (linked from the sidebar, shows a "coming soon"
  placeholder)
- Admin-side News posting (the passenger-facing News section on the
  landing page is done; there's no admin panel)

## Fixes from feedback round

- **Log In button color fixed** — text is blue (`#1e4fa1`) on the cyan
  button, matching Figma exactly (was mistakenly navy).
- **Removed the hero illustration** — it didn't match the Figma design,
  so the hero is back to the plain navy/photo-style banner with just
  the badge, headline, and subtext, like the original.
- **Points balance is now real** — the topbar shows the actual
  `REWARDS_POINTS` value instead of a static `00.00`.
- **Notifications are functional** — clicking the bell opens a dropdown
  with sample notifications (`NOTIFICATIONS` in `sampleData.js`).
- **Profile page fully built** (`/profile`) — matches the Figma "My
  Profile" frame: profile card (avatar, name, email, phone) + rewards
  points card side by side, plus an Account Settings section with a
  working (frontend-only) password change form. No more "coming soon."
- Removed the now-unused `ComingSoonPage` — every linked page in the
  app is a real page now.

## Landing page search now works end-to-end

- Clicking **Search** on the landing page's "Book a Seat" widget now
  shows an **"All Available Trips"** section right below it, on the
  same page — matching the Figma frame that shows results inline
  (previously it redirected straight to Login without showing anything).
- Clicking **Book Seat** from those guest results still goes to Login
  first (booking requires an account), same as the "Sign in required
  to complete booking" note. **Track Live** works without signing in.
- The trip list card UI is now a shared `TripList` component
  (`src/components/TripList.jsx`) used on both the landing page and
  the `/booking` page, instead of being duplicated in two places.
- Removed the single fixed "Office: Ecoland Terminal..." address from
  Contact Us and the footer, since SmartTransit covers multiple
  terminals across the region rather than one physical office.

## How to add your real Figma photos

Your images can't be downloaded automatically from my end (no internet
access in my build environment), but the code is now wired to use them
as soon as you drop them in yourself -- no code changes needed.

1. In Figma, click the photo layer (e.g. the bus interior photo behind
   the hero text).
2. In the right panel, scroll to **Export**, click the **+**, choose
   JPG or PNG, then click **Export**.
3. Save the file into `public/images/` in this project and name it
   **`hero-bus.jpg`** (see `public/images/README.md`).
4. Refresh your browser -- the hero section picks it up automatically.
   If the file isn't there, the hero just falls back to the flat navy
   gradient, so nothing breaks in the meantime.

Repeat the same pattern (save into `public/images/`, reference it with
`url("/images/your-file.jpg")` in the matching `.css` file) for any
other section you want a real photo in.
