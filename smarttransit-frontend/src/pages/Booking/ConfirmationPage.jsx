import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircleIcon, CoinIcon } from "../../components/Icons.jsx";
import QrPlaceholder from "../../components/QrPlaceholder.jsx";
import Button from "../../components/ui/Button.jsx";
import { useBooking } from "../../context/BookingContext.jsx";

export default function ConfirmationPage() {
  const navigate = useNavigate();
  const { booking, resetBooking } = useBooking();
  const { selectedTrip, selectedSeat, receipt } = booking;

  useEffect(() => {
    if (!selectedTrip || !selectedSeat) navigate("/booking", { replace: true });
  }, [selectedTrip, selectedSeat, navigate]);

  if (!selectedTrip || !selectedSeat) return null;

  const amountPaid = receipt ? receipt.amountPaid : selectedTrip.fare;

  const handleBackHome = () => {
    resetBooking();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-card sm:p-8">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
          <CheckCircleIcon size={36} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold text-navy-950">Booking Confirmed!</h1>
        <p className="mt-1 text-sm text-slate-500">Payment successful</p>

        {receipt && receipt.pointsEarned > 0 && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-sm font-semibold text-white">
            <span aria-hidden="true">🎉</span>
            You earned {receipt.pointsEarned.toLocaleString()} SmartPoints from this trip!
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-5 text-left">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-navy-950">
            <span>{selectedTrip.origin}</span>
            <span className="text-slate-300">→</span>
            <span>{selectedTrip.destination}</span>
          </div>

          <div className="my-5 border-t border-dashed border-slate-200" />

          <div className="flex justify-center">
            <QrPlaceholder size={140} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Bus</p>
              <p className="font-semibold text-navy-950">{selectedTrip.bus}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Date</p>
              <p className="font-semibold text-navy-950">{selectedTrip.departure}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Passenger</p>
              <p className="font-semibold text-navy-950">Seat {selectedSeat}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Fare Paid</p>
              <p className="font-semibold text-navy-950">₱{amountPaid.toFixed(2)}</p>
            </div>
          </div>

          {receipt && receipt.pointsUsed > 0 && (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <CoinIcon size={14} className="text-teal-600" />
                SmartPoints used
              </span>
              <span>
                {receipt.pointsUsed.toLocaleString()} pts (-₱{receipt.discount.toFixed(2)})
              </span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-teal-50 px-4 py-2.5 text-xs font-semibold text-teal-700">
            <CheckCircleIcon size={16} />
            Valid Ticket — Present QR code to board
          </div>
        </div>

        <Button variant="primary" size="lg" className="mt-6 w-full" onClick={handleBackHome}>
          Back To Home
        </Button>
      </div>
    </div>
  );
}
