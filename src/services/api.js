import axios from "axios";

const API_BASE_OVERRIDE_KEY = 'smart_transit_api_base_url';

const normalizeApiBase = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

const getSafeStorage = () => {
  if (typeof globalThis === 'undefined') return null;
  const storage = globalThis.localStorage;
  if (!storage || typeof storage.getItem !== 'function') return null;
  return storage;
};

const resolveApiBaseUrl = () => {
  const envBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL);
  const storage = getSafeStorage();

  if (typeof window === 'undefined') {
    return envBase || 'http://127.0.0.1:8000/api';
  }

  const params = new URLSearchParams(window.location.search || '');
  const queryBase = normalizeApiBase(params.get('apiBase'));
  if (queryBase) {
    storage?.setItem(API_BASE_OVERRIDE_KEY, queryBase);
    return queryBase;
  }

  const storedBase = normalizeApiBase(storage?.getItem(API_BASE_OVERRIDE_KEY));
  if (storedBase) return storedBase;

  if (envBase) return envBase;

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:8000/api';
  }

  // Production fallback (works when frontend and API are same origin/reverse-proxied).
  return `${window.location.origin}/api`;
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "ngrok-skip-browser-warning": "1",
  },
});

export default api;
