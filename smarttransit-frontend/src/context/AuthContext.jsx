import { createContext, useContext, useEffect, useState } from "react";

// Frontend-only authentication. There's no backend, so "accounts" live in
// localStorage as a small registry. One demo account is seeded so the app
// is usable without registering first.
const AUTH_STORAGE_KEY = "smarttransit.auth";
const USERS_STORAGE_KEY = "smarttransit.registeredUsers";

const DEMO_USER = {
  firstName: "Joshua",
  lastName: "Galo",
  name: "Joshua Galo",
  email: "joshua@example.com",
  password: "Passenger123",
  phone: "0926 718 2727",
};

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const hasDemo = stored.some((u) => u.email === DEMO_USER.email);
    return hasDemo ? stored : [DEMO_USER, ...stored];
  } catch {
    return [DEMO_USER];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function loadSession() {
  try {
    const fromLocal = localStorage.getItem(AUTH_STORAGE_KEY);
    const fromSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
    const raw = fromLocal || fromSession;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadSession);

  useEffect(() => {
    if (!localStorage.getItem(USERS_STORAGE_KEY)) {
      saveUsers([DEMO_USER]);
    }
  }, []);

  // login: returns { ok: true } or { ok: false, error }
  const login = ({ email, password, rememberMe }) => {
    const users = loadUsers();
    const match = users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!match || match.password !== password) {
      return { ok: false, error: "Incorrect email or password. Please try again." };
    }

    const { password: _pw, ...publicUser } = match;
    setUser(publicUser);

    const payload = JSON.stringify(publicUser);
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, payload);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEY, payload);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    return { ok: true };
  };

  // register: returns { ok: true } or { ok: false, error }
  const register = ({ fullName, email, phone, password }) => {
    const users = loadUsers();
    const exists = users.some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (exists) {
      return { ok: false, error: "An account with this email already exists." };
    }

    const [firstName, ...rest] = fullName.trim().split(" ");
    const newUser = {
      firstName: firstName || fullName.trim(),
      lastName: rest.join(" "),
      name: fullName.trim(),
      email: email.trim(),
      phone,
      password,
    };
    saveUsers([...users, newUser]);
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateProfile = (updates) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };

      const persistedLocal = localStorage.getItem(AUTH_STORAGE_KEY);
      const payload = JSON.stringify(next);
      if (persistedLocal) localStorage.setItem(AUTH_STORAGE_KEY, payload);
      else sessionStorage.setItem(AUTH_STORAGE_KEY, payload);

      const users = loadUsers().map((u) =>
        u.email === prev.email ? { ...u, ...updates } : u
      );
      saveUsers(users);

      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return context;
}
