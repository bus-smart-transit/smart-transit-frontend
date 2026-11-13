export const TERMINALS = [
  "Ecoland Terminal, Davao City",
  "Tagum Terminal, Tagum City",
  "Panabo Terminal, Panabo City",
  "Digos Terminal, Digos City",
  "Mati Terminal, Mati City",
  "Nabunturan Terminal, Nabunturan",
  "Malita Terminal, Malita",
];

// DEMO ONLY: the first two sample trips leave 5 and 9 minutes after the page
// loads (Manila time), so the BOARDING SOON status can be seen on real trip
// cards. Replace with real departure times when trips come from the backend.
function manilaClock(minutesFromNow) {
  const t = new Date(Date.now() + minutesFromNow * 60000);
  const [h, m] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(t)
    .split(":")
    .map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export const SAMPLE_TRIPS = [
  {
    id: "trip-1",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: manilaClock(5),
    arrival: manilaClock(5 + 90),
    bus: "Bus 01",
    duration: "1h 30m",
    seatsAvailable: 10,
    fare: 50,
  },
  {
    id: "trip-2",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: manilaClock(9),
    arrival: manilaClock(9 + 90),
    bus: "Bus 04",
    duration: "1h 30m",
    seatsAvailable: 10,
    fare: 50,
  },
  {
    id: "trip-3",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: "1:00 PM",
    arrival: "2:30 PM",
    bus: "Bus 07",
    duration: "1h 30m",
    seatsAvailable: 10,
    fare: 50,
  },
];

// Stops along the Ecoland → Tagum route, used by Travel Advice and the stop pickers.
//   type: "terminal" = start/end of the route
//         "stop"     = passengers can board and get off here
//         "pass"     = the bus only passes through
//   offset: minutes after departure · km: distance from Ecoland Terminal
export const ROUTE_INFO = {
  bus: "Aircon",
  via: "Via Panabo and Carmen",
  bound: "Bound for Tagum City",
};

export const ROUTE_STOPS = [
  { id: "ecoland", name: "Ecoland Terminal (DCOTT)", area: "Davao City", km: 0, offset: 0, type: "terminal" },
  { id: "maa", name: "Ma-a", area: "Davao City", km: 4.2, offset: 8, type: "pass" },
  { id: "buhangin", name: "Buhangin", area: "Davao City", km: 9.1, offset: 18, type: "pass" },
  { id: "airport", name: "Davao International Airport area", area: "Davao City", km: 13.4, offset: 24, type: "pass" },
  { id: "panacan", name: "Panacan", area: "Davao City", km: 17.2, offset: 30, type: "pass" },
  { id: "tibungco", name: "Tibungco / Bunawan", area: "Davao City", km: 22.5, offset: 38, type: "pass" },
  { id: "lasang", name: "Lasang", area: "Davao City boundary", km: 27.8, offset: 44, type: "pass" },
  { id: "panabo", name: "Panabo City", area: "Davao del Norte", km: 33.6, offset: 50, type: "stop" },
  { id: "carmen", name: "Carmen", area: "Davao del Norte", km: 43.1, offset: 65, type: "stop" },
  { id: "tagum", name: "Tagum Integrated Terminal", area: "Tagum City", km: 55.7, offset: 90, type: "terminal" },
];

export const UPCOMING_TRIPS = [
  {
    id: "upcoming-1",
    route: "Ecoland Terminal → Tagum Terminal",
    date: "June 10, 2026",
    time: "9:00 AM",
    status: "Confirmed",
  },
];

export const RECENT_BOOKINGS = [
  {
    id: "booking-1",
    origin: "Ecoland Terminal",
    destination: "Carmen Terminal",
    paidAt: "2026-11-07T13:38:00",
    amount: 102,
    status: "paid",
  },
  {
    id: "booking-2",
    origin: "Ecoland Terminal",
    destination: "Digos Terminal",
    paidAt: "2026-10-28T08:15:00",
    amount: 45,
    status: "paid",
  },
  {
    id: "booking-3",
    origin: "Ecoland Terminal",
    destination: "Panabo Terminal",
    paidAt: "2026-10-20T16:02:00",
    amount: 40,
    status: "paid",
  },
];

export const ACTIVE_ROUTES = [
  { id: "route-1", name: "Ecoland ⇄ Tagum", busesActive: 6 },
  { id: "route-2", name: "Ecoland ⇄ Digos", busesActive: 4 },
  { id: "route-3", name: "Ecoland ⇄ Mati", busesActive: 2 },
];

// --- Dashboard: Bus Schedule widget ------------------------------------------------------
export const BUS_SCHEDULE = [
  { id: "sched-1", route: "Ecoland → Tagum", time: "7:00 AM", bus: "Bus 01" },
  { id: "sched-2", route: "Ecoland → Tagum", time: "9:30 AM", bus: "Bus 04" },
  { id: "sched-3", route: "Ecoland → Digos", time: "8:00 AM", bus: "Bus 12" },
  { id: "sched-4", route: "Ecoland → Mati", time: "6:00 AM", bus: "Bus 20" },
  { id: "sched-5", route: "Ecoland → Panabo", time: "10:00 AM", bus: "Bus 07" },
];

// --- Dashboard: personal Route Statistics widget ------------------------------------------------------
export const ROUTE_STATS = {
  totalTrips: 5,
  mostTraveledRoute: "Ecoland ⇄ Tagum",
  totalSpent: 220,
  onTimeRate: 96,
};

export const ANNOUNCEMENTS = [
  {
    id: "note-1",
    title: "New Ecoland–Tagum express trip added at 5:30 AM",
    date: "June 3, 2026",
  },
  {
    id: "note-2",
    title: "Panabo route detour due to road repair",
    date: "May 28, 2026",
  },
];

// --- My Tickets ------------------------------------------------------
export const SAMPLE_TICKETS = [
  {
    bookingId: "ST-20260610-0142",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: "June 10, 2026 · 7:00 AM",
    status: "Confirmed",
    fare: 50,
  },
  {
    bookingId: "ST-20260528-0098",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Digos Terminal",
    departure: "May 28, 2026 · 8:30 AM",
    status: "Completed",
    fare: 45,
  },
  {
    bookingId: "ST-20260520-0061",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Panabo Terminal",
    departure: "May 20, 2026 · 1:00 PM",
    status: "Completed",
    fare: 40,
  },
  {
    bookingId: "ST-20260504-0027",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Mati Terminal",
    departure: "May 4, 2026 · 6:00 AM",
    status: "Cancelled",
    fare: 90,
  },
];

// --- Trip History ------------------------------------------------------
export const TRIP_HISTORY = [
  {
    id: "hist-1",
    date: "May 28, 2026",
    route: "Ecoland Terminal → Digos Terminal",
    operator: "SmartTransit Express",
    paymentStatus: "Paid",
    tripStatus: "Completed",
    fare: 45,
    paymentMethod: "GCash",
  },
  {
    id: "hist-2",
    date: "May 20, 2026",
    route: "Ecoland Terminal → Panabo Terminal",
    operator: "SmartTransit Express",
    paymentStatus: "Paid",
    tripStatus: "Completed",
    fare: 40,
    paymentMethod: "GCash",
  },
  {
    id: "hist-3",
    date: "May 4, 2026",
    route: "Ecoland Terminal → Mati Terminal",
    operator: "SmartTransit Express",
    paymentStatus: "Refunded",
    tripStatus: "Cancelled",
    fare: 90,
    paymentMethod: "GCash",
  },
  {
    id: "hist-4",
    date: "April 22, 2026",
    route: "Ecoland Terminal → Tagum Terminal",
    operator: "SmartTransit Express",
    paymentStatus: "Paid",
    tripStatus: "Completed",
    fare: 50,
    paymentMethod: "GCash",
  },
];

// --- Notifications (topbar bell) ------------------------------------------------------
export const NOTIFICATIONS = [
  {
    id: "notif-1",
    title: "Booking confirmed — Ecoland to Tagum",
    detail: "June 10, 2026 · 7:00 AM",
    time: "2h ago",
    read: false,
  },
  {
    id: "notif-2",
    title: "You earned 50 reward points",
    detail: "From your trip to Digos Terminal",
    time: "1d ago",
    read: false,
  },
  {
    id: "notif-3",
    title: "Panabo route detour due to road repair",
    detail: "Expect a few extra minutes on this route",
    time: "3d ago",
    read: true,
  },
];

// --- Rewards (SmartPoints) ------------------------------------------------------
// A simple cashback-style loyalty balance: ₱1 spent = 1 point, 1 point =
// ₱1 discount on a future ticket. See src/utils/rewards.js for the rules
// (including the Silver/Gold Rider tiers) and src/context/RewardsContext.jsx
// for the live balance + activity log this seed data feeds into.
export const REWARDS_POINTS = 340;

// "earn" entries come from completed ticket purchases, "redeem" entries
// come from using SmartPoints as a checkout discount.
export const REWARDS_ACTIVITY = [
  {
    id: "activity-1",
    type: "earn",
    points: 150,
    label: "Ticket purchase",
    route: "Ecoland Terminal → Tagum Terminal",
    date: "Aug 18, 2026",
  },
  {
    id: "activity-2",
    type: "redeem",
    points: 100,
    label: "Used for ticket discount",
    route: "Ecoland Terminal → Panabo Terminal",
    date: "Aug 12, 2026",
  },
  {
    id: "activity-3",
    type: "earn",
    points: 80,
    label: "Ticket purchase",
    route: "Ecoland Terminal → Digos Terminal",
    date: "Aug 5, 2026",
  },
  {
    id: "activity-4",
    type: "earn",
    points: 45,
    label: "Ticket purchase",
    route: "Ecoland Terminal → Panabo Terminal",
    date: "Jul 28, 2026",
  },
];

// --- FAQ (full FAQ page, grouped by category + homepage preview) ------------------------------------------------------
export const FAQ_CATEGORIES = [
  {
    category: "Getting Started",
    items: [
      {
        question: "What is SmartTransit?",
        answer:
          "SmartTransit is a bus transportation platform for commuters travelling across Davao Region XI. It lets you check live schedules, book a trip, pay online, and track your bus, all from your browser.",
      },
      {
        question: "Which routes does SmartTransit currently cover?",
        answer:
          "Trips connecting Davao City (Ecoland Terminal) to Tagum, Panabo, Digos, and Mati terminals across Davao Region XI.",
      },
      {
        question: "Do I need to create an account to use SmartTransit?",
        answer:
          "You can search trips and preview bus tracking as a guest. Booking a trip, viewing tickets, and earning rewards requires a free account.",
      },
    ],
  },
  {
    category: "Bus Tracking",
    items: [
      {
        question: "Can I track my bus before it arrives?",
        answer:
          "Yes. Open Track Bus to see your bus's current stop, next stop, and estimated arrival time. Guests can preview tracking; passengers with an upcoming trip see it linked to their booking.",
      },
      {
        question: "Is the tracking data real GPS?",
        answer:
          "This demo uses simulated tracking data to show how the feature will look and behave. Once GPS hardware and a backend are connected, this page will show each bus's real location.",
      },
    ],
  },
  {
    category: "Tickets & Payments",
    items: [
      {
        question: "How do I pay for my booking?",
        answer:
          "Bookings are paid online through GCash. Once payment is confirmed, your e-ticket and QR code appear in My Tickets right away.",
      },
      {
        question: "How do I board using my digital ticket?",
        answer:
          "Open My Tickets, select your upcoming booking, and show the QR code to the conductor when boarding.",
      },
      {
        question: "Can I get a refund if I cancel a ticket?",
        answer:
          "Cancelled bookings are refunded to your original GCash payment method. Refund status appears under Trip History.",
      },
    ],
  },
  {
    category: "Trips & Bookings",
    items: [
      {
        question: "What if I need to cancel or change my trip?",
        answer:
          "You can view and manage upcoming trips from My Tickets. Cancellation policies are shown before you confirm a change.",
      },
      {
        question: "Where can I see my past trips?",
        answer:
          "Trip History lists every completed and cancelled trip, along with fare, payment method, and status.",
      },
    ],
  },
  {
    category: "Rewards",
    items: [
      {
        question: "How do I earn reward points?",
        answer:
          "You earn 1 point for every ₱1 spent on fare. Points are added automatically after a completed trip.",
      },
      {
        question: "What can I use points for?",
        answer:
          "Every SmartPoint is worth ₱1 off a future ticket. Once you have at least 100 points, switch on \"Use SmartPoints\" at checkout and the discount is applied automatically.",
      },
    ],
  },
  {
    category: "Account",
    items: [
      {
        question: "How do I update my profile information?",
        answer:
          "Go to Profile and open Edit Profile to update your name, email, or phone number.",
      },
      {
        question: "I forgot my password. What do I do?",
        answer:
          "On the Login page, select \"Forgot Password?\" and enter your account email to receive reset instructions.",
      },
      {
        question: "Can I turn off notifications?",
        answer:
          "Yes. Notification preferences can be managed from the Notification Settings section on your Profile page.",
      },
    ],
  },
];

// --- Track Bus: multi-route live-tracking mock data ------------------------------------------------------
export const ACTIVE_BUSES = [
  {
    id: "bus-01",
    busNumber: "Bus 01",
    route: "Ecoland Terminal → Tagum Terminal",
    status: "On Time",
    currentStop: "Buhangin Checkpoint",
    nextStop: "Panabo Junction",
    eta: "12 min",
    lastUpdated: "Just now",
    progress: 45,
    path: [
      { x: 60, y: 260, label: "Ecoland Terminal" },
      { x: 220, y: 160, label: "Buhangin Checkpoint" },
      { x: 400, y: 190, label: "Panabo Junction" },
      { x: 560, y: 60, label: "Tagum Terminal" },
    ],
  },
  {
    id: "bus-04",
    busNumber: "Bus 04",
    route: "Ecoland Terminal → Tagum Terminal",
    status: "Delayed",
    currentStop: "Ecoland Terminal",
    nextStop: "Buhangin Checkpoint",
    eta: "28 min",
    lastUpdated: "2 min ago",
    progress: 10,
    path: [
      { x: 60, y: 260, label: "Ecoland Terminal" },
      { x: 220, y: 160, label: "Buhangin Checkpoint" },
      { x: 400, y: 190, label: "Panabo Junction" },
      { x: 560, y: 60, label: "Tagum Terminal" },
    ],
  },
  {
    id: "bus-12",
    busNumber: "Bus 12",
    route: "Ecoland Terminal → Digos Terminal",
    status: "On Time",
    currentStop: "Toril Crossing",
    nextStop: "Digos Terminal",
    eta: "9 min",
    lastUpdated: "Just now",
    progress: 72,
    path: [
      { x: 60, y: 80, label: "Ecoland Terminal" },
      { x: 260, y: 200, label: "Toril Crossing" },
      { x: 560, y: 260, label: "Digos Terminal" },
    ],
  },
  {
    id: "bus-20",
    busNumber: "Bus 20",
    route: "Ecoland Terminal → Mati Terminal",
    status: "Boarding",
    currentStop: "Ecoland Terminal",
    nextStop: "Panabo Junction",
    eta: "45 min",
    lastUpdated: "5 min ago",
    progress: 2,
    path: [
      { x: 60, y: 60, label: "Ecoland Terminal" },
      { x: 300, y: 140, label: "Panabo Junction" },
      { x: 460, y: 260, label: "Mainit Hot Spring" },
      { x: 580, y: 300, label: "Mati Terminal" },
    ],
  },
  {
    id: "bus-07",
    busNumber: "Bus 07",
    route: "Ecoland Terminal → Panabo Terminal",
    status: "On Time",
    currentStop: "Panabo Junction",
    nextStop: "Panabo Terminal",
    eta: "6 min",
    lastUpdated: "Just now",
    progress: 88,
    path: [
      { x: 60, y: 220, label: "Ecoland Terminal" },
      { x: 320, y: 140, label: "Buhangin Checkpoint" },
      { x: 560, y: 100, label: "Panabo Terminal" },
    ],
  },
];

