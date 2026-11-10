import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation as useRouterLocation } from "react-router-dom";
import Modal from "../components/ui/Modal.jsx";
import Button from "../components/ui/Button.jsx";
import { MapPinIcon, LocationIcon } from "../components/Icons.jsx";
import { detectMunicipality, findMunicipality, MUNICIPALITIES } from "../utils/geo.js";

// Remembers only the passenger's decision ("later" / "allowed") or a city they
// picked by hand. Exact coordinates are kept in memory only, never stored or sent.
const STORAGE_KEY = "smarttransit:location-choice";

function readChoice() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return raw.startsWith("{") ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function saveChoice(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    /* storage unavailable: the prompt may show again next visit */
  }
}

const ERROR_MESSAGES = {
  1: "Location access was blocked, so we're showing all trips. You can still search by origin and destination.",
  2: "We couldn't detect your location right now, so we're showing all trips.",
  3: "Finding your location took too long, so we're showing all trips.",
  unsupported: "Your browser doesn't support location, so we're showing all trips.",
  insecure: "Location only works on a secure (https) connection, so we're showing all trips.",
};

const LocationContext = createContext(null);

export function useUserLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used inside a <LocationProvider>");
  return ctx;
}

// Phases: "idle" | "prompt" | "locating" | "confirm" | "choose"
export function LocationProvider({ children }) {
  const { pathname } = useRouterLocation();
  const [phase, setPhase] = useState("idle");
  const [firstVisitPending, setFirstVisitPending] = useState(() => readChoice() === null);
  const [candidate, setCandidate] = useState(null); // detected place awaiting confirmation
  const [location, setLocation] = useState(null); // { source, municipality, province, point }
  const [notice, setNotice] = useState(null);
  const [manualChoice, setManualChoice] = useState("");

  const fail = useCallback((key) => {
    setPhase("idle");
    setCandidate(null);
    setNotice(ERROR_MESSAGES[key] ?? ERROR_MESSAGES[2]);
  }, []);

  // Ask the browser for the position. Only ever called after the passenger
  // agreed in our own popup (or agreed on an earlier visit).
  const locate = useCallback(
    ({ silent = false } = {}) => {
      setNotice(null);
      if (!window.isSecureContext) return fail("insecure");
      if (!("geolocation" in navigator)) return fail("unsupported");

      setPhase(silent ? "idle" : "locating");
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const point = { lat: coords.latitude, lng: coords.longitude };
          const place = detectMunicipality(point);
          const previous = readChoice();
          // Returning visitor whose place hasn't changed: skip the question.
          if (silent && place && previous?.confirmed === place.municipality) {
            setLocation({ source: "gps", point, ...place });
            setPhase("idle");
            return;
          }
          setCandidate({ point, place });
          setPhase("confirm");
        },
        (error) => (silent ? setPhase("idle") : fail(error.code)),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 }
      );
      return undefined;
    },
    [fail]
  );

  // On the homepage: first-time visitors see the explainer popup; returning
  // visitors get their earlier choice back.
  useEffect(() => {
    if (pathname !== "/" || location) return undefined;
    const choice = readChoice();

    if (choice === null) {
      const id = window.setTimeout(() => {
        setPhase((p) => (p === "idle" ? "prompt" : p));
        setFirstVisitPending(false);
      }, 500);
      return () => window.clearTimeout(id);
    }

    if (choice?.manual) {
      const m = findMunicipality(choice.manual);
      if (m) setLocation({ source: "manual", municipality: m.municipality, province: m.province, point: m.center });
    } else if (choice === "allowed" || choice?.confirmed) {
      // Re-use the browser permission only if it is still granted; never re-prompt.
      navigator.permissions
        ?.query({ name: "geolocation" })
        .then((status) => status.state === "granted" && locate({ silent: true }))
        .catch(() => {});
    }
    return undefined;
  }, [pathname, location, locate]);

  const allow = () => {
    saveChoice("allowed");
    locate();
  };

  const maybeLater = () => {
    saveChoice("later");
    setPhase("idle");
  };

  const confirmCandidate = () => {
    const { point, place } = candidate;
    saveChoice({ confirmed: place.municipality });
    setLocation({ source: "gps", point, ...place });
    setCandidate(null);
    setPhase("idle");
  };

  const openChooser = () => {
    setManualChoice(location?.municipality ?? candidate?.place?.municipality ?? "");
    setPhase("choose");
  };

  const applyManualChoice = () => {
    const m = findMunicipality(manualChoice);
    if (!m) return;
    saveChoice({ manual: m.municipality });
    setLocation({ source: "manual", municipality: m.municipality, province: m.province, point: m.center });
    setCandidate(null);
    setNotice(null);
    setPhase("idle");
  };

  const closeFlow = () => {
    if (readChoice() === null) saveChoice("later");
    setCandidate(null);
    setPhase("idle");
  };

  const value = {
    location,
    notice,
    isLocating: phase === "locating",
    // True while a location popup is open or about to open on the first visit,
    // so other first-visit popups (the onboarding tour) can wait their turn.
    isBusy: phase !== "idle" || (firstVisitPending && pathname === "/"),
    requestLocation: () => setPhase("prompt"),
    chooseLocation: openChooser,
    dismissNotice: () => setNotice(null),
  };

  const place = candidate?.place;

  return (
    <LocationContext.Provider value={value}>
      {children}

      {/* 1. Explain why before the browser asks */}
      <Modal open={phase === "prompt" || phase === "locating"} onClose={closeFlow} title="Find Trips Near You">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy-800">
            <LocationIcon size={28} />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Allow SmartTransit Davao to access your location so we can suggest nearby bus terminals,
            bus stops, and available trips.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Your location is only used on this device to suggest nearby terminals. It is not saved or
            shared.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button variant="primary" onClick={allow} disabled={phase === "locating"} className="w-full">
              {phase === "locating" ? "Finding your location…" : "Allow Location Access"}
            </Button>
            <Button variant="ghost" onClick={maybeLater} disabled={phase === "locating"} className="w-full">
              Maybe Later
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. Confirm the detected place */}
      <Modal
        open={phase === "confirm"}
        onClose={closeFlow}
        title={place ? `Are you in ${place.municipality}?` : "Where are you travelling from?"}
      >
        {place ? (
          <>
            <p className="text-sm text-slate-600">We detected your approximate location. Is this correct?</p>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <MapPinIcon size={18} className="mt-0.5 shrink-0 text-navy-700" />
              <div>
                <p className="font-semibold text-navy-950">
                  {place.municipality}, {place.province}
                </p>
                <p className="text-xs text-slate-500">Based on your current location</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button variant="primary" onClick={confirmCandidate} className="w-full sm:flex-1">
                Yes, That&apos;s Right
              </Button>
              <Button variant="outline" onClick={openChooser} className="w-full sm:flex-1">
                Change Location
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              You seem to be outside the areas SmartTransit currently serves. Choose the city or
              municipality you&apos;ll travel from to see the nearest terminals.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button variant="primary" onClick={openChooser} className="w-full sm:flex-1">
                Choose Location
              </Button>
              <Button variant="outline" onClick={closeFlow} className="w-full sm:flex-1">
                Show All Trips
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* 3. Manual choice */}
      <Modal open={phase === "choose"} onClose={closeFlow} title="Choose your location">
        <label htmlFor="manual-municipality" className="text-sm font-semibold text-navy-950">
          City or municipality
        </label>
        <select
          id="manual-municipality"
          value={manualChoice}
          onChange={(e) => setManualChoice(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-navy-950 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
        >
          <option value="">Select city or municipality…</option>
          {MUNICIPALITIES.map((m) => (
            <option key={m.municipality} value={m.municipality}>
              {m.municipality}, {m.province}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-500">Only places with a SmartTransit stop are listed.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" onClick={applyManualChoice} disabled={!manualChoice} className="w-full sm:flex-1">
            Use this location
          </Button>
          <Button variant="outline" onClick={closeFlow} className="w-full sm:flex-1">
            Cancel
          </Button>
        </div>
      </Modal>
    </LocationContext.Provider>
  );
}
