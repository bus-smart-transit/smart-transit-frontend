import { useState, useEffect, useCallback, useRef } from "react";
import { AuthContext } from "../AuthContext";
import PassengerService from "../../PassengerService/PassengerService";

const SERVICE_MAP = {
  passenger: PassengerService,
};

// Auto-logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

export function AuthProvider({ role = "passenger", children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  const tokenKey = `${role}_token`;
  const activeService = SERVICE_MAP[role];

  // Computed once on initial render — no effect needed for this.
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    !!(localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey))
  );

  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      if (!isAuthenticated || !activeService) {
        setIsLoading(false);
        return;
      }
      try {
        const profile = await activeService.getProfile();
        if (!cancelled) setUser(profile?.data ?? profile); // unwrap the envelope
      } catch {
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(tokenKey);
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, tokenKey, activeService]);

  const login = useCallback(
    (token, remember = false) => {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(tokenKey, token);
      setIsAuthenticated(true); // triggers the fetchProfile effect above
    },
    [tokenKey]
  );

  const logout = useCallback(async () => {
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);
    setUser(null);
    setIsAuthenticated(false);

    if (activeService) {
      activeService.logout().catch((err) => {
        console.error(`Logout failed for role: ${role}`, err);
      });
    }
  }, [activeService, tokenKey, role]);

  // Inactivity auto-logout: reset timer on any user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer(); // start on mount
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      clearTimeout(inactivityTimerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isAuthenticated, logout]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}