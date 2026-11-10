import { createContext, useContext, useState } from "react";

const BookingContext = createContext(null);

const initialState = {
  origin: "",
  destination: "",
  date: "",
  selectedTrip: null, // the trip card the passenger clicked "Book Trip" on
  dropOffStop: null, // stop id chosen under "View Route Stops" on that card, if any
  // Filled in on the trip details page: { seatType, quantity, bookingOption, travelDate,
  // paymentMethod, useSmartPoints, dropOffMode, originStop, destinationStop, unitFare, grossTotal }
  details: null,
  receipt: null, // { fare, pointsUsed, discount, amountPaid, pointsEarned } set once payment succeeds
};

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState(initialState);

  const updateSearch = ({ origin, destination, date }) => {
    setBooking((prev) => ({ ...prev, origin, destination, date }));
  };

  const selectTrip = (trip, dropOffStop = null) => {
    setBooking((prev) => ({
      ...prev,
      selectedTrip: trip,
      dropOffStop,
      details: null,
      receipt: null,
    }));
  };

  const setDetails = (details) => {
    setBooking((prev) => ({ ...prev, details, receipt: null }));
  };

  const setReceipt = (receipt) => {
    setBooking((prev) => ({ ...prev, receipt }));
  };

  const resetBooking = () => setBooking(initialState);

  return (
    <BookingContext.Provider
      value={{
        booking,
        updateSearch,
        selectTrip,
        setDetails,
        setReceipt,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

// Small helper hook so pages can just do `const { booking } = useBooking()`
export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used inside a <BookingProvider>");
  }
  return context;
}
