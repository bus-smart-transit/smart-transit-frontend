import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { ClockIcon, BusIcon, MapPinIcon } from "../../components/Icons.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { BUS_SEAT_COLUMNS, BUS_SEAT_ROWS, TAKEN_SEATS } from "../../data/sampleData.js";

export default function SeatSelectionPage() {
  const navigate = useNavigate();
  const { booking, selectSeat } = useBooking();
  const { selectedTrip, selectedSeat } = booking;

  useEffect(() => {
    if (!selectedTrip) navigate("/booking", { replace: true });
  }, [selectedTrip, navigate]);

  if (!selectedTrip) return null;

  const seatNumbers = Array.from(
    { length: BUS_SEAT_COLUMNS.length * BUS_SEAT_ROWS },
    (_, i) => String(i + 1)
  );

  const handlePickSeat = (seat) => {
    if (TAKEN_SEATS.includes(seat)) return;
    selectSeat(seat);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AppTopBar backTo="/booking" backLabel="Back to Search" />

      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Route
              </span>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                {selectedTrip.seatsAvailable} seats available
              </span>
            </div>
            <p className="mt-2 font-display text-lg font-bold text-navy-950">
              {selectedTrip.origin} → {selectedTrip.destination}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ClockIcon size={14} /> Departure
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-950">{selectedTrip.departure}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <ClockIcon size={14} /> Arrival
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-950">{selectedTrip.arrival}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <BusIcon size={14} /> Vehicle
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-950">{selectedTrip.bus}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPinIcon size={14} /> Duration
                </p>
                <p className="mt-1 text-sm font-semibold text-navy-950">{selectedTrip.duration}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-navy-950">Select Your Seat</h2>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <i className="h-3.5 w-3.5 rounded border border-slate-300 bg-white" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3.5 w-3.5 rounded bg-black" /> Taken
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-3.5 w-3.5 rounded bg-navy-800" /> Your selection
              </span>
            </div>

            <div className="mt-5 flex justify-center">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {seatNumbers.map((seat) => {
                  const isTaken = TAKEN_SEATS.includes(seat);
                  const isSelected = selectedSeat === seat;
                  return (
                    <button
                      key={seat}
                      disabled={isTaken}
                      onClick={() => handlePickSeat(seat)}
                      className={`flex h-10 w-12 items-center justify-center rounded-lg text-xs font-semibold transition-colors sm:h-11 sm:w-16 sm:text-sm ${
                        isTaken
                          ? "cursor-not-allowed bg-black text-white"
                          : isSelected
                          ? "bg-navy-800 text-white"
                          : "border border-slate-300 bg-white text-navy-900 hover:border-navy-700 hover:bg-navy-50"
                      }`}
                    >
                      {seat}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSeat && (
              <p className="mt-4 text-center text-sm font-semibold text-teal-700">Seat {selectedSeat} selected</p>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-navy-950">Booking Summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Route</dt>
              <dd className="text-right font-medium text-navy-950">
                {selectedTrip.origin} → {selectedTrip.destination}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Departure</dt>
              <dd className="font-medium text-navy-950">{selectedTrip.departure}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Seat</dt>
              <dd className="font-medium text-navy-950">
                {selectedSeat ? `Seat ${selectedSeat}` : "Not selected yet"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Passengers</dt>
              <dd className="font-medium text-navy-950">1</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Fare per passenger</dt>
              <dd className="font-medium text-navy-950">₱{selectedTrip.fare.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm font-semibold text-navy-950">Total</span>
            <span className="font-display text-xl font-bold text-navy-950">
              ₱{selectedTrip.fare.toFixed(2)}
            </span>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="mt-5 w-full"
            disabled={!selectedSeat}
            onClick={() => navigate("/booking/payment")}
          >
            Continue To Payment
          </Button>
        </Card>
      </div>
    </div>
  );
}