// Google sign-in via Google Identity Services (loaded from Google's CDN, no npm package).
// Requires VITE_GOOGLE_CLIENT_ID in .env — see .env.example.

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let scriptPromise = null;

export const isGoogleConfigured = Boolean(CLIENT_ID);

function loadScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Couldn't reach Google. Check your connection and try again."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// Opens the Google account picker and resolves with { name, firstName, lastName, email, picture }.
export async function signInWithGoogle() {
  if (!CLIENT_ID) {
    throw new Error("Google sign-in isn't set up yet. Add VITE_GOOGLE_CLIENT_ID to your .env file.");
  }
  await loadScript();

  const accessToken = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) reject(new Error("Google sign-in was cancelled or failed."));
        else resolve(response.access_token);
      },
      error_callback: () => reject(new Error("Google sign-in was cancelled.")),
    });
    client.requestAccessToken({ prompt: "select_account" });
  });

  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Couldn't load your Google profile. Please try again.");
  const info = await res.json();

  return {
    name: info.name || info.email,
    firstName: info.given_name || info.name || "",
    lastName: info.family_name || "",
    email: info.email,
    picture: info.picture,
  };
}
