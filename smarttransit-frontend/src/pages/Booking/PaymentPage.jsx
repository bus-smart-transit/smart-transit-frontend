import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import { CardIcon } from "../../components/Icons.jsx";
import { useBooking } from "../../context/BookingContext.jsx";

export default function PaymentPage() {
  const navigate = useNavigate();
  const { booking } = useBooking();
  const { selectedTrip, selectedSeat } = booking;

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppTopBar backTo="/booking/seats" backLabel="Back" />

      <div className="container-page flex justify-center py-10">
        <Card className="w-full max-w-lg p-6 sm:p-8">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
            <CardIcon size={24} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-navy-950">Confirm Payment</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your booking and complete the transaction
          </p>

          <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
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
              <dd className="font-medium text-navy-950">Seat {selectedSeat}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Passengers</dt>
              <dd className="font-medium text-navy-950">1</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Fare per passenger</dt>
              <dd className="font-medium text-navy-950">₱{selectedTrip.fare.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="font-semibold text-navy-950">Total</dt>
              <dd className="font-display text-lg font-bold text-navy-950">
                ₱{selectedTrip.fare.toFixed(2)}
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Payment Method
          </p>
          <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-navy-800 bg-navy-50 px-4 py-3">
            <span className="text-sm font-semibold text-navy-900">GCash</span>
            <span className="h-2.5 w-2.5 rounded-full bg-navy-800" />
          </div>

          <Button
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            onClick={() => navigate("/booking/gcash")}
          >
            Continue and go to payment
          </Button>
        </Card>
      </div>
    </div>
  );
}
