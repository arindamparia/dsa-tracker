/**
 * Clerk authentication module — vanilla JS, no bundler.
 *
 * SETUP (one-time, in Netlify Dashboard → Environment variables):
 *   1. CLERK_JWT_KEY     — Clerk Dashboard → API Keys → "Show JWT public key"
 *   2. CLERK_SECRET_KEY  — Clerk Dashboard → API Keys → Secret key
 *
 * SETUP (one-time, in Clerk Dashboard → Sessions → Customize session token):
 *   Add claim: { "email": "{{user.primary_email_address}}" }
 *   This embeds email in the JWT so backend needs no extra API call.
 *
 * The Clerk Publishable Key goes in index.html:
 *   <meta name="clerk-publishable-key" content="pk_live_..." />
 *   <meta name="clerk-domain" content="https://YOUR-FAPI.clerk.accounts.dev" />
 *
 * Token refresh: Clerk automatically refreshes session tokens before they
 *   expire. Calling session.getToken() always returns a valid, fresh token —
 *   no manual refresh logic required.
 */

const PK = document.querySelector('meta[name="clerk-publishable-key"]')?.content || "";
const DOMAIN = document.querySelector('meta[name="clerk-domain"]')?.content || "";

/** Load the Clerk JS browser bundle and initialize the Clerk instance. */
async function loadClerk() {
  if (window._clerk) return window._clerk;

  if (!PK || PK.startsWith("REPLACE")) {
    // Dev mode — Clerk not configured, skip auth
    window._clerk = null;
    return null;
  }

  // Try jsDelivr first (reliable public CDN), then fall back to FAPI CDN
  const urls = [
    "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js",
    ...(DOMAIN ? [`${DOMAIN.replace(/\/$/, "")}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`] : []),
  ];

  let loaded = false;
  for (const src of urls) {
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        // Clerk v5 reads the publishable key from this attribute on load
        s.setAttribute("data-clerk-publishable-key", PK);
        s.crossOrigin = "anonymous";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      loaded = true;
      break;
    } catch {
      // try next URL
    }
  }

  if (!loaded || !window.Clerk) throw new Error("Failed to load Clerk JS from all sources");

  // In Clerk v5 CDN mode, window.Clerk is a pre-configured instance, not a constructor
  const clerk = window.Clerk;
  await clerk.load();
  window._clerk = clerk;
  return clerk;
}

/**
 * Initializes Clerk auth. If the user is not signed in, redirects to
 * Clerk's hosted sign-in page and returns false (app should not boot).
 * Returns true if the user is already signed in (or dev mode).
 */
export async function initAuth() {
  try {
    const clerk = await loadClerk();
    if (!clerk) return true; // Clerk not configured (PK missing)

    if (!clerk.user) {
      window.location.href = '/welcome.html';
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the current Clerk session token (JWT).
 * Clerk automatically refreshes the token when it nears expiry —
 * always returns a valid token, no manual refresh needed.
 */
export async function getToken() {
  try {
    return (await window._clerk?.session?.getToken()) || "";
  } catch {
    return "";
  }
}

/** Returns the signed-in user's primary email address (lowercase). */
export function getUserEmail() {
  return (
    window._clerk?.user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ""
  );
}

/** Returns the signed-in user's display name. */
export function getUserName() {
  const u = window._clerk?.user;
  if (!u) return "";
  return u.fullName || u.firstName || getUserEmail().split("@")[0] || "";
}

/**
 * Signs the user out via Clerk, then reloads the page.
 * The Clerk session cookie is cleared automatically.
 */
export async function signOut() {
  try {
    await window._clerk?.signOut();
  } catch {
    // fallthrough
  }
  window.location.href = '/welcome.html';
}
