import { useState, useEffect, useCallback } from "react";
import PassengerService from "../api/PassengerService/PassengerService";

/**
 * usePassengerAuth — composable hook for passenger authentication state.
 *
 * Usage:
 *   const { passenger, isAuthenticated, isLoading, logout } = usePassengerAuth();
 */
export function usePassengerAuth() {
  const [passenger, setPassenger] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!(
    localStorage.getItem("passenger_token") ||
    sessionStorage.getItem("passenger_token")
  );

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await PassengerService.getProfile();
        if (!cancelled) setPassenger(profile);
      } catch {
        // Token invalid / expired
        localStorage.removeItem("passenger_token");
        sessionStorage.removeItem("passenger_token");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const logout = useCallback(async () => {
    await PassengerService.logout();
    setPassenger(null);
  }, []);

  return { passenger, isAuthenticated, isLoading, logout };
}
