/**
 * Shared Clerk JWT verification for all Netlify functions.
 *
 * Uses CLERK_SECRET_KEY to verify session tokens via Clerk's API.
 *
 * Required env vars (set in Netlify Dashboard → Environment variables):
 *   CLERK_SECRET_KEY  — Clerk Dashboard → API Keys → Secret key
 *
 * Session token custom claim (configure once in Clerk Dashboard → Sessions →
 *   "Customize session token" → add): { "email": "{{user.primary_email_address}}" }
 *   This embeds email in the JWT so the backend needs no extra API call.
 *
 * Dev fallback: if CLERK_SECRET_KEY is not set, returns the default user email so
 *   `netlify dev` works without Clerk configured.
 */
import { verifyToken, createClerkClient } from "@clerk/backend";

let _clerk = null;
function getClerk() {
  if (!_clerk && process.env.CLERK_SECRET_KEY) {
    _clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  }
  return _clerk;
}

/**
 * Extracts and verifies the Clerk session token from the request Authorization
 * header. Returns { email, clerkId } for the authenticated user.
 *
 * Throws an error with statusCode = 401 if the token is missing or invalid.
 */
export async function getAuthInfo(event) {
  // ── Extract Bearer token from Authorization header ────────────────
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization || "";
  const token = authHeader.replace(/^bearer\s+/i, "").trim();

  if (!token) {
    throw authError("No token provided");
  }

  try {
    // ── Verify JWT via Clerk secret key ───────────────────────────
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const clerkId = payload.sub;

    // ── Get email — fast path: from custom JWT claim ───────────────
    if (payload.email) {
      return { email: String(payload.email).toLowerCase(), clerkId };
    }

    // ── Slow path: fetch user from Clerk API ──────────────────────
    const clerk = getClerk();
    const user = await clerk.users.getUser(clerkId);
    const primary = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    );
    const email = primary?.emailAddress;
    if (!email) throw new Error("No primary email on Clerk account");

    return { email: email.toLowerCase(), clerkId };
  } catch (err) {
    if (err.statusCode === 401) throw err;
    throw authError(err.message);
  }
}

/** Convenience wrapper — returns only the email (used by most functions). */
export async function getAuthEmail(event) {
  return (await getAuthInfo(event)).email;
}

function authError(msg) {
  const err = new Error("Unauthorized: " + msg);
  err.statusCode = 401;
  return err;
}

/** Builds a 401 response object for use in function handlers. */
export function unauthorized(message = "Unauthorized") {
  return {
    statusCode: 401,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: false, error: message }),
  };
}
