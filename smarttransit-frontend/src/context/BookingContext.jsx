import { createContext, useContext, useState } from "react";

const BookingContext = createContext(null);

const initialState = {
  origin: "",
  destination: "",
  date: "",
  selectedTrip: null, // the trip card the passenger clicked "Book Seat" on
  selectedSeat: null, // e.g. "13"
  useSmartPoints: false, // whether the passenger toggled "Use SmartPoints" on at checkout
  receipt: null, // { fare, pointsUsed, discount, amountPaid, pointsEarned } set once payment succeeds
};

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState(initialState);

  const updateSearch = ({ origin, destination, date }) => {
    setBooking((prev) => ({ ...prev, origin, destination, date }));
  };

  const selectTrip = (trip) => {
    setBooking((prev) => ({
      ...prev,
      selectedTrip: trip,
      selectedSeat: null,
      useSmartPoints: false,
      receipt: null,
    }));
  };

  const selectSeat = (seat) => {
    setBooking((prev) => ({ ...prev, selectedSeat: seat }));
  };

  const setUseSmartPoints = (useSmartPoints) => {
    setBooking((prev) => ({ ...prev, useSmartPoints }));
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
        selectSeat,
        setUseSmartPoints,
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
