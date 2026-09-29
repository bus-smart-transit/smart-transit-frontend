import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext.jsx";
import { useRewards } from "../../context/RewardsContext.jsx";
import { calculateCheckout } from "../../utils/rewards.js";
import { findStop } from "../../utils/route.js";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";

// Sample checkout screens — a real payment gateway would take over here.
const METHODS = {
  gcash: {
    label: "GCash",
    header: "bg-blue-600",
    button: "!bg-blue-600 hover:!bg-blue-700",
    fields: [
      { label: "GCash Mobile Number", type: "tel", placeholder: "09XX XXX XXXX", defaultValue: "0917 123 4567" },
      { label: "MPIN", type: "password", placeholder: "••••", maxLength: 4, defaultValue: "1234" },
    ],
  },
  maya: {
    label: "Maya",
    header: "bg-emerald-600",
    button: "!bg-emerald-600 hover:!bg-emerald-700",
    fields: [
      { label: "Maya Mobile Number", type: "tel", placeholder: "09XX XXX XXXX", defaultValue: "0917 123 4567" },
      { label: "Password", type: "password", placeholder: "••••••", defaultValue: "123456" },
    ],
  },
  card: {
    label: "Credit / Debit Card",
    header: "bg-navy-800",
    button: "",
    fields: [
      { label: "Card Number", inputMode: "numeric", placeholder: "1234 5678 9012 3456", defaultValue: "4242 4242 4242 4242" },
      { label: "Expiry (MM/YY)", placeholder: "MM/YY", defaultValue: "12/28" },
      { label: "CVV", type: "password", placeholder: "•••", maxLength: 4, defaultValue: "123" },
    ],
  },
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { booking, setReceipt } = useBooking();
  const { selectedTrip, details } = booking;
  const { points, earnPoints, redeemPoints } = useRewards();
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!selectedTrip || !details) navigate("/booking", { replace: true });
  }, [selectedTrip, details, navigate]);

  if (!selectedTrip || !details) return null;

  const method = METHODS[details.paymentMethod] ?? METHODS.gcash;
  const { pointsUsed, discount, amountToPay } = calculateCheckout(
    details.grossTotal,
    points,
    details.useSmartPoints
  );

  const handlePay = () => {
    setStatus("processing");
    setTimeout(() => {
      // Payment just succeeded — apply the SmartPoints redemption (if any),
      // then award SmartPoints on the amount actually paid. Never runs for
      // a cancelled/failed booking since this only fires on a successful pay.
      const route = `${findStop(details.originStop).name} → ${findStop(details.destinationStop).name}`;
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
        fare: details.grossTotal,
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
        <div className={`rounded-xl px-4 py-3 text-center font-display text-lg font-bold text-white ${method.header}`}>
          {method.label}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Sample checkout screen — SmartTransit would redirect here to the real {method.label} payment
          page once a payment gateway is connected.
        </p>

        <div className="mt-5 space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>
              {details.quantity} × ₱{details.unitFare.toFixed(2)} ({details.seatType})
            </span>
            <span>₱{details.grossTotal.toFixed(2)}</span>
          </div>
          {pointsUsed > 0 && (
            <div className="flex justify-between font-medium text-teal-700">
              <span>SmartPoints Discount ({pointsUsed} pts)</span>
              <span>-₱{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-500">Amount to Pay</span>
            <span className="font-display text-xl font-bold text-navy-950">₱{amountToPay.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {method.fields.map(({ label, ...field }) => (
            <FormInput key={label} label={label} {...field} />
          ))}
        </div>

        <Button
          variant="primary"
          size="lg"
          className={`mt-6 w-full ${method.button}`}
          onClick={handlePay}
          disabled={status === "processing"}
        >
          {status === "processing" ? "Processing…" : `Pay ₱${amountToPay.toFixed(2)}`}
        </Button>
        <button
          type="button"
          onClick={() => navigate("/booking/details")}
          disabled={status === "processing"}
          className="mt-3 w-full text-center text-sm font-semibold text-slate-500 hover:text-navy-900"
        >
          Back to booking details
        </button>
      </div>
    </div>
  );
}
