import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import TravelAdvice from "../../components/TravelAdvice.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import {
  ClockIcon,
  BusIcon,
  MapPinIcon,
  CardIcon,
  PhoneIcon,
  WalletIcon,
  CoinIcon,
} from "../../components/Icons.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { useRewards } from "../../context/RewardsContext.jsx";
import { calculateCheckout, MIN_REDEMPTION_POINTS } from "../../utils/rewards.js";
import { BOARDING_STOPS, calculateUnitFare, findStop, formatTravelDate } from "../../utils/route.js";

const PAYMENT_METHODS = [
  { id: "gcash", label: "GCash", icon: PhoneIcon },
  { id: "maya", label: "Maya", icon: WalletIcon },
  { id: "card", label: "Card", icon: CardIcon },
];

const MAX_TICKETS = 10;
const FIRST_STOP = BOARDING_STOPS[0].id;
const LAST_STOP = BOARDING_STOPS[BOARDING_STOPS.length - 1].id;

const toISODate = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const LABEL = "text-sm font-semibold text-navy-950";
const SELECT =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-navy-950 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20 disabled:bg-slate-50 disabled:text-slate-400";

export default function TripDetailsPage() {
  const navigate = useNavigate();
  const { booking, setDetails, setReceipt } = useBooking();
  const { selectedTrip, details: saved } = booking;
  const { points, earnPoints, redeemPoints } = useRewards();

  const todayISO = toISODate(new Date());
  const searchedLater = booking.date && booking.date > todayISO;

  const [form, setForm] = useState(
    () =>
      saved ?? {
        seatType: "seated",
        quantity: 1,
        bookingOption: searchedLater ? "later" : "now",
        laterDate: searchedLater ? booking.date : "",
        paymentMethod: "gcash",
        useSmartPoints: false,
        dropOffMode: "terminal",
        originStop: FIRST_STOP,
        destinationStop: LAST_STOP,
      }
  );

  useEffect(() => {
    if (!selectedTrip) navigate("/booking", { replace: true });
  }, [selectedTrip, navigate]);

  if (!selectedTrip) return null;

  const update = (changes) => setForm((prev) => ({ ...prev, ...changes }));

  const maxTickets = form.seatType === "seated" ? Math.min(MAX_TICKETS, selectedTrip.seatsAvailable) : MAX_TICKETS;
  const quantity = Math.min(Math.max(1, Number(form.quantity) || 1), maxTickets);
  const travelDate = form.bookingOption === "now" ? todayISO : form.laterDate;

  const originStop = findStop(form.originStop);
  const destinationStop = findStop(form.destinationStop);
  const unitFare = calculateUnitFare(selectedTrip.fare, form.originStop, form.destinationStop);
  const grossTotal = unitFare * quantity;
  const { eligible, pointsUsed, discount, amountToPay } = calculateCheckout(grossTotal, points, form.useSmartPoints);

  const canContinue = unitFare > 0 && Boolean(travelDate);
  const paymentLabel = PAYMENT_METHODS.find((m) => m.id === form.paymentMethod).label;

  const handleDropOffMode = (dropOffMode) =>
    update(
      dropOffMode === "terminal"
        ? { dropOffMode, originStop: FIRST_STOP, destinationStop: LAST_STOP }
        : { dropOffMode, originStop: "", destinationStop: "" }
    );

  const handleContinue = () => {
    const nextDetails = { ...form, quantity, travelDate, unitFare, grossTotal };
    setDetails(nextDetails);

    if (amountToPay > 0) {
      navigate("/booking/checkout");
      return;
    }

    // SmartPoints cover the whole fare — nothing to charge, so confirm right away.
    const route = `${originStop.name} → ${destinationStop.name}`;
    const date = formatTravelDate(todayISO);
    if (pointsUsed > 0) redeemPoints({ pointsUsed, route, date });
    const pointsEarned = earnPoints({ amountPaid: 0, route, date });
    setReceipt({ fare: grossTotal, pointsUsed, discount, amountPaid: 0, pointsEarned });
    navigate("/booking/confirmation");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppTopBar backTo="/booking" backLabel="Back to Search" />

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Route */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Route</span>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                {selectedTrip.seatsAvailable} seats available
              </span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-navy-950">
              {selectedTrip.origin} → {selectedTrip.destination}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: ClockIcon, label: "Departure", value: selectedTrip.departure },
                { icon: ClockIcon, label: "Arrival", value: selectedTrip.arrival },
                { icon: BusIcon, label: "Vehicle", value: selectedTrip.bus },
                { icon: MapPinIcon, label: "Duration", value: selectedTrip.duration },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Icon size={14} /> {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy-950">{value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Travel Advice */}
          <Card className="p-5 sm:p-6">
            <TravelAdvice trip={selectedTrip} originId={form.originStop} destinationId={form.destinationStop} />
          </Card>

          {/* Seat and Payment */}
          <Card className="space-y-6 p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-navy-950">Seat and Payment</h2>

            <fieldset>
              <legend className={LABEL}>Seat Type</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { id: "seated", label: "Seated" },
                  { id: "standing", label: "Standing" },
                ].map((option) => (
                  <RadioPill
                    key={option.id}
                    name="seatType"
                    checked={form.seatType === option.id}
                    onChange={() => update({ seatType: option.id })}
                    label={option.label}
                  />
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="quantity" className={LABEL}>
                Ticket Quantity
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={maxTickets}
                value={form.quantity}
                onChange={(e) => update({ quantity: e.target.value })}
                onBlur={() => update({ quantity })}
                className={SELECT}
              />
              <p className="mt-1.5 text-xs text-slate-500">Up to {maxTickets} tickets per booking.</p>
            </div>

            <fieldset>
              <legend className={LABEL}>Booking Option</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                <RadioPill
                  name="bookingOption"
                  checked={form.bookingOption === "now"}
                  onChange={() => update({ bookingOption: "now" })}
                  label="Book Now"
                />
                <RadioPill
                  name="bookingOption"
                  checked={form.bookingOption === "later"}
                  onChange={() => update({ bookingOption: "later" })}
                  label="Book Later"
                />
              </div>
              {form.bookingOption === "now" ? (
                <p className="mt-2 text-sm text-amber-600">
                  You&apos;re booking this trip for today, {formatTravelDate(todayISO)}.
                </p>
              ) : (
                <input
                  type="date"
                  aria-label="Travel date"
                  min={toISODate(new Date(Date.now() + 86400000))}
                  value={form.laterDate}
                  onChange={(e) => update({ laterDate: e.target.value })}
                  className={`${SELECT} sm:max-w-xs`}
                />
              )}
            </fieldset>

            <fieldset>
              <legend className={`flex items-center gap-2 ${LABEL}`}>
                <CardIcon size={16} /> Payment
              </legend>
              <p className="mt-1 text-sm text-slate-500">Online booking is paid online by default.</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
                  const active = form.paymentMethod === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => update({ paymentMethod: id })}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-sm font-semibold transition ${
                        active
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon size={20} />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 px-4 py-2">
                <p className="flex items-center gap-1.5 pt-1.5 text-sm text-slate-500">
                  <CoinIcon size={14} className="text-teal-600" />
                  Available Rewards: <strong className="text-navy-950">{points.toLocaleString()} SmartPoints</strong>
                </p>
                {eligible ? (
                  <Toggle
                    checked={form.useSmartPoints}
                    onChange={(useSmartPoints) => update({ useSmartPoints })}
                    label="Use reward points"
                    description={`1 SmartPoint = ₱1 off. Up to ${Math.min(points, grossTotal).toLocaleString()} points can be applied.`}
                  />
                ) : (
                  <p className="py-2.5 text-xs text-slate-500">
                    Earn {(MIN_REDEMPTION_POINTS - points).toLocaleString()} more points to start using
                    rewards for a discount.
                  </p>
                )}
              </div>
            </fieldset>

            <div>
              <label htmlFor="dropOffMode" className={LABEL}>
                Drop-off Mode
              </label>
              <select
                id="dropOffMode"
                value={form.dropOffMode}
                onChange={(e) => handleDropOffMode(e.target.value)}
                className={SELECT}
              >
                <option value="terminal">Terminal to Terminal</option>
                <option value="route">Route Stop</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="originStop" className={`flex items-center gap-1.5 ${LABEL}`}>
                  <MapPinIcon size={15} /> Origin Stop
                </label>
                <select
                  id="originStop"
                  value={form.originStop}
                  disabled={form.dropOffMode === "terminal"}
                  onChange={(e) => {
                    const origin = findStop(e.target.value);
                    const dest = findStop(form.destinationStop);
                    update({
                      originStop: e.target.value,
                      destinationStop: dest && origin && dest.km > origin.km ? form.destinationStop : "",
                    });
                  }}
                  className={SELECT}
                >
                  <option value="">Select origin stop…</option>
                  {BOARDING_STOPS.slice(0, -1).map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="destinationStop" className={`flex items-center gap-1.5 ${LABEL}`}>
                  <MapPinIcon size={15} /> Destination Stop
                </label>
                <select
                  id="destinationStop"
                  value={form.destinationStop}
                  disabled={form.dropOffMode === "terminal" || !originStop}
                  onChange={(e) => update({ destinationStop: e.target.value })}
                  className={SELECT}
                >
                  <option value="">Select destination stop…</option>
                  {BOARDING_STOPS.filter((stop) => originStop && stop.km > originStop.km).map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Booking Summary */}
        <Card className="h-fit p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-navy-950">Booking Summary</h2>
          <dl className="mt-4 divide-y divide-slate-100 text-sm">
            <SummaryRow
              label="Route"
              value={originStop && destinationStop ? `${originStop.name} to ${destinationStop.name}` : "—"}
            />
            <SummaryRow label="Seat Type" value={form.seatType === "seated" ? "Seated" : "Standing"} />
            <SummaryRow label="Destination" value={destinationStop?.name ?? "—"} />
            <SummaryRow label="Payment" value={`Online · ${paymentLabel}`} />
            <SummaryRow label="Unit Fare" value={`₱${unitFare.toFixed(2)}`} />
            <SummaryRow label="Quantity" value={quantity} />
            <SummaryRow
              label="Booking"
              value={
                form.bookingOption === "now"
                  ? "Now (Today)"
                  : travelDate
                  ? `Later (${formatTravelDate(travelDate)})`
                  : "Later — pick a date"
              }
            />
            <SummaryRow label="Gross Total" value={`₱${grossTotal.toFixed(2)}`} />
            <SummaryRow
              label="Rewards Applied"
              value={pointsUsed > 0 ? `${pointsUsed} pts (-₱${discount.toFixed(2)})` : "0 pts"}
            />
          </dl>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-sm font-semibold text-navy-950">Net Total</span>
            <span className="font-display text-xl font-bold text-navy-950">₱{amountToPay.toFixed(2)}</span>
          </div>
          <Button variant="primary" size="lg" className="mt-5 w-full" disabled={!canContinue} onClick={handleContinue}>
            <CardIcon size={18} />
            {amountToPay > 0 ? "Continue to Payment" : "Confirm Booking"}
          </Button>
          {!canContinue && (
            <p className="mt-2 text-center text-xs text-slate-500">
              {unitFare === 0 ? "Choose your origin and destination stops." : "Pick a travel date."}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function RadioPill({ name, checked, onChange, label }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
        checked ? "border-navy-700 bg-navy-50 text-navy-900" : "border-slate-300 text-slate-600 hover:border-slate-400"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 accent-navy-800" />
      {label}
    </label>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-slate-400">{label}</dt>
      <dd className="text-right font-semibold text-navy-950">{value}</dd>
    </div>
  );
}
