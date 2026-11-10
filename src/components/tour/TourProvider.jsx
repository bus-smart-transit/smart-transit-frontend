import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Logo from "../Logo.jsx";
import { CheckCircleIcon, InfoIcon } from "../Icons.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useUserLocation } from "../../context/LocationContext.jsx";
import { buildTourSteps } from "./tourSteps.js";

const STORAGE_KEY = "smarttransit:onboarding-tour-seen";

// localStorage can be missing or throw (private windows, blocked storage).
// The tour still works then; it just shows the welcome modal again.
function hasSeenTour() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markTourSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

const TourContext = createContext(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside a <TourProvider>");
  return ctx;
}

// Phases: "idle" -> "welcome" -> "touring" -> "complete" -> "idle"
export function TourProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { isBusy: locationBusy } = useUserLocation();
  const location = useLocation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("idle");
  const [pendingStart, setPendingStart] = useState(false);
  const driverRef = useRef(null);
  const finishedRef = useRef(false);

  const runTour = useCallback(() => {
    driverRef.current?.destroy();
    finishedRef.current = false;
    window.scrollTo({ top: 0 });
    setPhase("touring");

    const tour = driver({
      steps: buildTourSteps({ isAuthenticated }),
      showProgress: true,
      progressText: "Step {{current}} of {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Previous",
      doneBtnText: "Finish",
      showButtons: ["next", "previous", "close"],
      popoverClass: "st-tour-popover",
      overlayColor: "#091934",
      overlayOpacity: 0.65,
      stagePadding: 8,
      stageRadius: 16,
      smoothScroll: true,
      allowClose: true,
      onPopoverRender: (popover, { state, driver: api }) => {
        const total = api.getConfig().steps?.length ?? 1;
        const current = (state.activeIndex ?? 0) + 1;

        // Progress bar under the description.
        const bar = document.createElement("div");
        bar.className = "st-tour-progress";
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-valuemin", "1");
        bar.setAttribute("aria-valuemax", String(total));
        bar.setAttribute("aria-valuenow", String(current));
        bar.innerHTML = `<span style="width:${(current / total) * 100}%"></span>`;
        popover.footer.before(bar);

        // Skip Tour button, shown on every step except the last.
        if (current < total) {
          const skip = document.createElement("button");
          skip.type = "button";
          skip.className = "st-tour-skip";
          skip.textContent = "Skip tour";
          skip.addEventListener("click", () => api.destroy());
          popover.footerButtons.prepend(skip);
        }
      },
      onNextClick: (_el, _step, { driver: api }) => {
        if (api.isLastStep()) {
          finishedRef.current = true;
          api.destroy();
        } else {
          api.moveNext();
        }
      },
      onDestroyed: () => {
        driverRef.current = null;
        markTourSeen();
        setPhase(finishedRef.current ? "complete" : "idle");
      },
    });

    driverRef.current = tour;
    // Let the scroll-to-top settle before measuring the first element.
    window.setTimeout(() => tour.drive(), 150);
  }, [isAuthenticated]);

  // Start (or restart) the tour from anywhere. The tour lives on the
  // homepage, so other pages navigate there first.
  const startTour = useCallback(() => {
    setPhase("idle");
    if (location.pathname !== "/") {
      setPendingStart(true);
      navigate("/");
    } else {
      runTour();
    }
  }, [location.pathname, navigate, runTour]);

  useEffect(() => {
    if (pendingStart && location.pathname === "/") {
      // Wait for the homepage to render before measuring its elements.
      const id = window.setTimeout(() => {
        setPendingStart(false);
        runTour();
      }, 300);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [pendingStart, location.pathname, runTour]);

  // First-time visitors to the homepage get the welcome modal.
  useEffect(() => {
    if (location.pathname !== "/" || hasSeenTour() || locationBusy) return undefined;
    const id = window.setTimeout(() => setPhase((p) => (p === "idle" ? "welcome" : p)), 600);
    return () => window.clearTimeout(id);
  }, [location.pathname, locationBusy]);

  // Leaving the page mid-tour closes it.
  useEffect(() => {
    if (location.pathname !== "/") driverRef.current?.destroy();
  }, [location.pathname]);

  useEffect(() => () => driverRef.current?.destroy(), []);

  const dismissWelcome = () => {
    markTourSeen();
    setPhase("idle");
  };

  return (
    <TourContext.Provider value={{ startTour, isTouring: phase === "touring" }}>
      {children}

      <Modal open={phase === "welcome"} onClose={dismissWelcome} title="Welcome to SmartTransit">
        <div className="text-center">
          <Logo className="mx-auto h-14 sm:h-16" />
          <h3 className="mt-4 font-display text-xl font-bold text-navy-950">Ride smarter across Davao Region</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            New here? Take a short tour to see how to search trips, track your bus, and find your
            digital ticket. It takes about a minute.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={dismissWelcome}>
              Maybe later
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPhase("idle");
                runTour();
              }}
            >
              Start tour
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={phase === "complete"} onClose={() => setPhase("idle")} title="Tour complete">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <CheckCircleIcon size={30} />
          </span>
          <h3 className="mt-4 font-display text-xl font-bold text-navy-950">You're all set!</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Start by searching for a trip. You can take this tour again from the
            <span className="font-semibold text-navy-800"> Take the tour</span> link in the footer.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={runTour}>
              Restart tour
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPhase("idle");
                document.getElementById("trip-search")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Search trips
            </Button>
          </div>
        </div>
      </Modal>

      {location.pathname === "/" && phase === "idle" && (
        <button
          type="button"
          onClick={startTour}
          className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white shadow-card-hover transition-colors hover:bg-navy-900 sm:bottom-6 sm:right-6"
          aria-label="Take the site tour"
        >
          <InfoIcon size={18} />
          <span className="hidden sm:inline">Take the tour</span>
        </button>
      )}
    </TourContext.Provider>
  );
}
