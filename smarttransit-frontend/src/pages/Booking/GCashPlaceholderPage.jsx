import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "../../context/BookingContext.jsx";
import Button from "../../components/ui/Button.jsx";
import FormInput from "../../components/ui/FormInput.jsx";

export default function GCashPlaceholderPage() {
  const navigate = useNavigate();
  const { booking } = useBooking();
  const { selectedTrip, selectedSeat } = booking;
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  const handlePay = () => {
    setStatus("processing");
    setTimeout(() => {
      setStatus("done");
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

        <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-500">Amount to Pay</span>
          <span className="font-display text-xl font-bold text-navy-950">
            ₱{selectedTrip.fare.toFixed(2)}
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
          {status === "processing" ? "Processing…" : `Pay ₱${selectedTrip.fare.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
}
