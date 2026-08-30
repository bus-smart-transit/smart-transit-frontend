import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext.jsx";
import { useRewards } from "../../context/RewardsContext.jsx";
import { calculateCheckout } from "../../utils/rewards.js";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";

export default function GCashPlaceholderPage() {
  const navigate = useNavigate();
  const { booking, setReceipt } = useBooking();
  const { selectedTrip, selectedSeat, useSmartPoints } = booking;
  const { points, earnPoints, redeemPoints } = useRewards();
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  const { pointsUsed, discount, amountToPay } = calculateCheckout(
    selectedTrip.fare,
    points,
    useSmartPoints
  );

  const handlePay = () => {
    setStatus("processing");
    setTimeout(() => {
      setStatus("done");

      // Payment just succeeded — apply the SmartPoints redemption (if any),
      // then award SmartPoints on the amount actually paid. Never runs for
      // a cancelled/failed booking since this only fires on a successful pay.
      const route = `${selectedTrip.origin} → ${selectedTrip.destination}`;
      const today = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (pointsUsed > 0) {
        redeemPoints({ pointsUsed, route, date: today });
      }
      const pointsEarned = earnPoints({ amountPaid: amountToPay, route, date: today });

      setReceipt({
        fare: selectedTrip.fare,
        pointsUsed,
        discount,
        amountPaid: amountToPay,
        pointsEarned,
      });

      navigate("/booking/confirmation");
    }, 1400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-950 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 sm:p-7">
        <div className="rounded-xl bg-blue-600 px-4 py-3 text-center font-display text-lg font-bold text-white">
          GCash
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Sample checkout screen — SmartTransit would redirect here to the real GCash app once a
          payment gateway is connected.
        </p>

        {pointsUsed > 0 && (
          <div className="mt-5 space-y-1.5 rounded-xl bg-teal-50 px-4 py-3 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Ticket Fare</span>
              <span>₱{selectedTrip.fare.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium text-teal-700">
              <span>SmartPoints Discount ({pointsUsed} pts)</span>
              <span>-₱{discount.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-500">Amount to Pay</span>
          <span className="font-display text-xl font-bold text-navy-950">
            ₱{amountToPay.toFixed(2)}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          <FormInput label="GCash Mobile Number" type="tel" placeholder="09XX XXX XXXX" defaultValue="0917 123 4567" />
          <FormInput label="MPIN" type="password" placeholder="••••" maxLength={4} defaultValue="1234" />
        </div>

        <Button
          variant="primary"
          size="lg"
          className="mt-6 w-full !bg-blue-600 hover:!bg-blue-700"
          onClick={handlePay}
          disabled={status === "processing"}
        >
          {status === "processing" ? "Processing…" : `Pay ₱${amountToPay.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
