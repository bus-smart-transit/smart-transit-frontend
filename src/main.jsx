import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { BookingProvider } from "./context/BookingContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { RewardsProvider } from "./context/RewardsContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RewardsProvider>
          <BookingProvider>
            <App />
          </BookingProvider>
        </RewardsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
