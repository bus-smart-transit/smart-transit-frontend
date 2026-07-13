// Centralized sample data. Once a backend exists, these would be
// replaced with real API calls — keeping them in one file makes
// that swap easier later.

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

// 36-seat layout, laid out as 9 rows x 4 seats (A/B aisle C/D)
export const BUS_SEAT_COLUMNS = ["A", "B", "C", "D"];
export const BUS_SEAT_ROWS = 9;

// A handful of seats are already booked, just for realism.
export const TAKEN_SEATS = ["3", "7", "14", "21", "28", "33"];

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

// --- Rewards ------------------------------------------------------
export const REWARDS_POINTS = 340;
export const REWARDS_NEXT_TIER = 500;
export const REWARDS_TIER = "Silver Rider";

export const AVAILABLE_REWARDS = [
  {
    id: "reward-1",
    title: "₱20 Fare Discount",
    description: "Use on any single trip within Davao Region XI.",
    cost: 100,
  },
  {
    id: "reward-2",
    title: "Free Seat Reservation Fee",
    description: "Waives the reservation fee on your next booking.",
    cost: 150,
  },
  {
    id: "reward-3",
    title: "₱50 Fare Discount",
    description: "Use on any single trip within Davao Region XI.",
    cost: 250,
  },
  {
    id: "reward-4",
    title: "Free One-Way Ticket (Ecoland ⇄ Digos)",
    description: "Redeem a full one-way fare on this route.",
    cost: 400,
  },
];

export const EARNED_BADGES = [
  { id: "badge-1", label: "First Trip", earned: true },
  { id: "badge-2", label: "5 Trips Completed", earned: true },
  { id: "badge-3", label: "Early Bird (5AM trip)", earned: true },
  { id: "badge-4", label: "10 Trips Completed", earned: false },
  { id: "badge-5", label: "Frequent Rider", earned: false },
];

export const REDEMPTION_HISTORY = [
  {
    id: "redeem-1",
    date: "May 15, 2026",
    reward: "₱20 Fare Discount",
    pointsUsed: 100,
  },
  {
    id: "redeem-2",
    date: "April 2, 2026",
    reward: "Free Seat Reservation Fee",
    pointsUsed: 150,
  },
];

