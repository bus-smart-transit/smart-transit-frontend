import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppTopBar from "../../components/AppTopBar.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import { CardIcon, CoinIcon } from "../../components/Icons.jsx";
import { useBooking } from "../../context/BookingContext.jsx";
import { useRewards } from "../../context/RewardsContext.jsx";
import { calculateCheckout, MIN_REDEMPTION_POINTS } from "../../utils/rewards.js";

export default function PaymentPage() {
  const navigate = useNavigate();
  const { booking, setUseSmartPoints, setReceipt } = useBooking();
  const { selectedTrip, selectedSeat, useSmartPoints } = booking;
  const { points, earnPoints, redeemPoints } = useRewards();

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  const { eligible, pointsUsed, discount, amountToPay } = calculateCheckout(
    selectedTrip.fare,
    points,
    useSmartPoints
  );
  const fullyCoveredByPoints = amountToPay <= 0;

  // When SmartPoints cover the whole fare there's nothing left to charge to
  // GCash, so skip that screen and confirm the booking immediately — the
  // same redeem/earn side effects GCashPlaceholderPage runs on a real pay.
  const handleContinue = () => {
    if (!fullyCoveredByPoints) {
      navigate("/booking/gcash");
      return;
    }

    const route = `${selectedTrip.origin} → ${selectedTrip.destination}`;
    const date = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (pointsUsed > 0) {
      redeemPoints({ pointsUsed, route, date });
    }
    const pointsEarned = earnPoints({ amountPaid: amountToPay, route, date });

    setReceipt({
      fare: selectedTrip.fare,
      pointsUsed,
      discount,
      amountPaid: amountToPay,
      pointsEarned,
    });

    navigate("/booking/confirmation");
  };

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
              <dt className="text-slate-400">Ticket Fare</dt>
              <dd className="font-medium text-navy-950">₱{selectedTrip.fare.toFixed(2)}</dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <CoinIcon size={14} className="text-teal-600" /> SmartPoints Balance
              </p>
              <p className="text-sm font-semibold text-navy-950">{points.toLocaleString()} points</p>
            </div>

            {eligible ? (
              <>
                <div className="mt-1 border-t border-slate-100">
                  <Toggle
                    checked={useSmartPoints}
                    onChange={setUseSmartPoints}
                    label="Use SmartPoints"
                    description={`Apply ${pointsUsed.toLocaleString()} points as a discount on this ticket`}
                  />
                </div>

                {useSmartPoints && (
                  <div className="mt-2 space-y-2 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-400">SmartPoints Discount</dt>
                      <dd className="font-medium text-teal-700">-₱{discount.toFixed(2)}</dd>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Earn {(MIN_REDEMPTION_POINTS - points).toLocaleString()} more points to start using
                SmartPoints for a discount.
              </p>
            )}
          </div>

          <dl className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-sm">
            <dt className="font-semibold text-navy-950">Amount to Pay</dt>
            <dd className="font-display text-lg font-bold text-navy-950">₱{amountToPay.toFixed(2)}</dd>
          </dl>

          {!fullyCoveredByPoints && (
            <>
              <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Payment Method
              </p>
              <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-navy-800 bg-navy-50 px-4 py-3">
                <span className="text-sm font-semibold text-navy-900">GCash</span>
                <span className="h-2.5 w-2.5 rounded-full bg-navy-800" />
              </div>
            </>
          )}

          <Button variant="primary" size="lg" className="mt-6 w-full" onClick={handleContinue}>
            {fullyCoveredByPoints ? "Confirm Booking" : "Continue and go to payment"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
