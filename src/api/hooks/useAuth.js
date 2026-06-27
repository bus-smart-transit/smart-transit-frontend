import { useState, useEffect, useCallback, useContext } from "react";
import { AuthContext } from "./AuthContext";
import PassengerService from "../../api/PassengerService/PassengerService";
// import EmployeeService from "../../api/EmployeeService/EmployeeService";
// import AdminService from "../../api/AdminService/AdminService";

const SERVICE_MAP = {
  passenger: PassengerService,
  // employee: EmployeeService,
  // admin: AdminService,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}

export function useAuthRole(role) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const tokenKey = `${role}_token`;
  const activeService = SERVICE_MAP[role];

  const isAuthenticated = !!(
    localStorage.getItem(tokenKey) || sessionStorage.getItem(tokenKey)
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
        if (!cancelled) setUser(profile);
      } catch {
        localStorage.removeItem(tokenKey);
        sessionStorage.removeItem(tokenKey);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, tokenKey, activeService]);

  const logout = useCallback(async () => {
    if (activeService) {
      try {
        await activeService.logout();
      } catch (err) {
        console.error(`Logout failed for role: ${role}`, err);
      }
    }
    localStorage.removeItem(tokenKey);
    sessionStorage.removeItem(tokenKey);
    setUser(null);
  }, [activeService, tokenKey, role]);

  return { user, isAuthenticated, isLoading, logout };
}
