// Steps for the first-time onboarding tour. Every step points at a real
// element on the homepage via a `data-tour` attribute, so the tour only
// describes features that actually exist on the page.

// Return the first matching element that is currently visible. Lets one
// step target the desktop navbar or the mobile menu button depending on
// the screen width.
function firstVisible(...selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.getClientRects().length > 0) return el;
  }
  return undefined;
}

export function buildTourSteps({ isAuthenticated }) {
  return [
    {
      element: () => firstVisible('[data-tour="nav-links"]', '[data-tour="nav-menu"]'),
      popover: {
        title: "Find your way around",
        description:
          "Use the menu to jump to Home, About, Track Bus, FAQ and Contact Us from any page.",
      },
    },
    {
      element: () => firstVisible('[data-tour="nav-track-bus"]', '[data-tour="nav-menu"]'),
      popover: {
        title: "Track your bus",
        description: "Open Track Bus to follow a bus's location and see when it should arrive.",
      },
    },
    {
      element: '[data-tour="search-trips"] form',
      popover: {
        title: "Search Trips",
        description:
          "Choose where you board, where you get off and the day. You need to sign in to finish a booking.",
      },
    },
    {
      element: () => firstVisible('[data-tour="nav-account"]', '[data-tour="nav-menu"]'),
      popover: isAuthenticated
        ? {
            title: "Your account",
            description:
              "Open your account menu for your Dashboard, My Tickets, Trip History, Rewards and Profile.",
          }
        : {
            title: "Log in to book",
            description:
              "Log in or create an account to book seats, keep your digital tickets and view your trip history.",
          },
    },
  ];
}
