import { createContext, useContext, useState } from "react";

const BookingContext = createContext(null);

const initialState = {
  origin: "",
  destination: "",
  date: "",
  selectedTrip: null, // the trip card the passenger clicked "Book Seat" on
  selectedSeat: null, // e.g. "13"
};

export function BookingProvider({ children }) {
  const [booking, setBooking] = useState(initialState);

  const updateSearch = ({ origin, destination, date }) => {
    setBooking((prev) => ({ ...prev, origin, destination, date }));
  };

  const selectTrip = (trip) => {
    setBooking((prev) => ({ ...prev, selectedTrip: trip, selectedSeat: null }));
  };

  const selectSeat = (seat) => {
    setBooking((prev) => ({ ...prev, selectedSeat: seat }));
  };

  const resetBooking = () => setBooking(initialState);

  return (
    <BookingContext.Provider
      value={{ booking, updateSearch, selectTrip, selectSeat, resetBooking }}
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
