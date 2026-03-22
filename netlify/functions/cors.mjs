/**
 * Shared CORS headers for all Netlify functions.
 *
 * Production setup:
 *   Set ALLOWED_ORIGIN env var in Netlify Dashboard → Site config → Environment variables
 *   to your deployed frontend URL (e.g. https://yoursite.netlify.app).
 *   This prevents other origins from making credentialed requests to your API.
 *
 * Defaults to '*' only when ALLOWED_ORIGIN is unset (local dev / CI).
 */
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Vary": "Origin",
};
