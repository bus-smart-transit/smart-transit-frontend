export const TERMINALS = [
  "Ecoland Terminal, Davao City",
  "Tagum Terminal, Tagum City",
  "Panabo Terminal, Panabo City",
  "Digos Terminal, Digos City",
  "Mati Terminal, Mati City",
];

export const SAMPLE_TRIPS = [
  {
    id: "trip-1",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: "7:00 AM",
    arrival: "8:30 AM",
    bus: "Bus 01",
    duration: "1h 30m",
    seatsAvailable: 10,
    fare: 50,
  },
  {
    id: "trip-2",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: "9:30 AM",
    arrival: "11:00 AM",
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

// 49-seat layout: 11 rows x 4 seats (A/B aisle C/D) plus a 5-seat back bench.
export const BUS_SEAT_COLUMNS = ["A", "B", "C", "D"];
export const BUS_SEAT_ROWS = 11;
export const BACK_BENCH_SEAT_COUNT = 5;

// A handful of seats are already booked, just for realism.
export const TAKEN_SEATS = ["3", "7", "14", "21", "28", "33", "46", "48"];

export const UPCOMING_TRIPS = [
  {
    id: "upcoming-1",
    route: "Ecoland Terminal → Tagum Terminal",
    date: "June 10, 2026",
    time: "9:00 AM",
    seat: "13",
    status: "Confirmed",
  },
];

export const RECENT_BOOKINGS = [
  {
    id: "booking-1",
    route: "Ecoland Terminal → Digos Terminal",
    date: "May 28, 2026",
    amount: 45,
    status: "Completed",
  },
  {
    id: "booking-2",
    route: "Ecoland Terminal → Panabo Terminal",
    date: "May 20, 2026",
    amount: 40,
    status: "Completed",
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

// Dummy GPS path for the Track Bus demo — a straight-line stand-in
// for the Ecoland -> Tagum route. Replace with real coordinates and
// a real map SDK once GPS hardware/backend is available.
export const DUMMY_GPS_PATH = [
  { lat: 7.0644, lng: 125.6078, label: "Ecoland Terminal" },
  { lat: 7.1907, lng: 125.6144, label: "Buhangin Checkpoint" },
  { lat: 7.313, lng: 125.6435, label: "Panabo Junction" },
  { lat: 7.4479, lng: 125.6825, label: "Tagum Terminal" },
];

// --- My Tickets ------------------------------------------------------
export const SAMPLE_TICKETS = [
  {
    bookingId: "ST-20260610-0142",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Tagum Terminal",
    departure: "June 10, 2026 · 7:00 AM",
    seat: "13",
    status: "Confirmed",
    fare: 50,
  },
  {
    bookingId: "ST-20260528-0098",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Digos Terminal",
    departure: "May 28, 2026 · 8:30 AM",
    seat: "7",
    status: "Completed",
    fare: 45,
  },
  {
    bookingId: "ST-20260520-0061",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Panabo Terminal",
    departure: "May 20, 2026 · 1:00 PM",
    seat: "22",
    status: "Completed",
    fare: 40,
  },
  {
    bookingId: "ST-20260504-0027",
    operator: "SmartTransit Express",
    origin: "Ecoland Terminal",
    destination: "Mati Terminal",
    departure: "May 4, 2026 · 6:00 AM",
    seat: "5",
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
    seat: "7",
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
    seat: "22",
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
    seat: "5",
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
    seat: "18",
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
    detail: "Seat 13 · June 10, 2026 · 7:00 AM",
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

// --- News (full News page + homepage preview) ------------------------------------------------------
export const NEWS_ITEMS = [
  {
    id: "news-1",
    category: "Route Update",
    date: "June 3, 2026",
    title: "New Ecoland–Tagum express trip added at 5:30 AM",
    summary:
      "An earlier departure has been added on weekdays to help commuters beat rush hour traffic.",
    body: [
      "Starting this month, SmartTransit is adding a new 5:30 AM express trip on the Ecoland–Tagum route, running Monday through Friday.",
      "The express service makes limited stops and is designed for commuters who need to be in Tagum before the morning rush. Seats can be reserved in advance through the app just like any other trip.",
      "This is the third schedule expansion this year as ridership on the northern routes continues to grow.",
    ],
  },
  {
    id: "news-2",
    category: "Service Advisory",
    date: "May 28, 2026",
    title: "Panabo route detour due to road repair",
    summary:
      "Buses passing through Panabo will take an alternate route until repairs are completed.",
    body: [
      "Ongoing road repair along the national highway near Panabo Junction will require all SmartTransit buses on the Ecoland–Panabo route to take a short detour through the local barangay road.",
      "Passengers should expect an additional 10 to 15 minutes of travel time until repairs are complete. Live tracking will reflect the detoured route automatically.",
      "We appreciate our passengers' patience while local authorities complete the repair work.",
    ],
  },
  {
    id: "news-3",
    category: "Holiday Schedule",
    date: "May 20, 2026",
    title: "Adjusted trips for the Davao Fiesta holiday",
    summary:
      "Expect fewer trips and higher demand on routes to Mati and Digos during the holiday weekend.",
    body: [
      "In observance of the Davao Fiesta holiday weekend, SmartTransit will run a reduced weekend schedule on the Mati and Digos routes.",
      "Because demand is traditionally higher during this weekend, we recommend booking your seat at least two days in advance through My Tickets.",
      "Regular weekday schedules resume the following Monday.",
    ],
  },
  {
    id: "news-4",
    category: "Product Update",
    date: "May 12, 2026",
    title: "SmartPoints can now be used directly at checkout",
    summary:
      "Frequent riders can now switch on SmartPoints during payment and see the discount applied instantly.",
    body: [
      "SmartTransit Rewards now works like straightforward cashback: every ₱1 spent on a ticket earns 1 SmartPoint, and every SmartPoint is worth ₱1 off a future fare.",
      "Once a passenger has at least 100 points, a new \"Use SmartPoints\" toggle appears on the payment page. Turning it on applies the discount automatically — no separate voucher required.",
      "Points, discounts, and rewards activity can be tracked anytime from the Rewards page.",
    ],
  },
  {
    id: "news-5",
    category: "Safety",
    date: "April 30, 2026",
    title: "All buses now equipped with live GPS tracking",
    summary:
      "Every active SmartTransit bus can now be tracked in real time from the Track Bus page.",
    body: [
      "As of this week, all buses in the SmartTransit fleet have been fitted with GPS tracking units, allowing passengers to see their bus's current stop and estimated arrival time before it arrives at the terminal.",
      "This rollout completes a six-month effort to bring live tracking to every route we operate across Davao Region XI.",
    ],
  },
  {
    id: "news-6",
    category: "Service Advisory",
    date: "April 18, 2026",
    title: "Terminal window hours extended at Ecoland Terminal",
    summary:
      "The Ecoland Terminal help desk now stays open later to assist passengers with walk-in concerns.",
    body: [
      "The passenger help desk at Ecoland Terminal is now open from 5:00 AM to 9:00 PM daily, an extension of two hours from the previous schedule.",
      "This change is in response to passenger feedback requesting more support during early morning and evening trips.",
    ],
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
          "SmartTransit is a bus transportation platform for commuters travelling across Davao Region XI. It lets you check live schedules, reserve a seat, pay online, and track your bus, all from your browser.",
      },
      {
        question: "Which routes does SmartTransit currently cover?",
        answer:
          "Trips connecting Davao City (Ecoland Terminal) to Tagum, Panabo, Digos, and Mati terminals across Davao Region XI.",
      },
      {
        question: "Do I need to create an account to use SmartTransit?",
        answer:
          "You can search trips and preview bus tracking as a guest. Booking a seat, viewing tickets, and earning rewards requires a free account.",
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
        question: "How do I pay for my seat?",
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

