/**
 * version-gate — Edge function that enforces minimum client version.
 *
 * Runs at the CDN edge BEFORE any serverless function.
 * Any client sending an X-Client-Version header that is older than
 * MIN_CLIENT_VERSION (Netlify env var) gets a 426 Upgrade Required response.
 * The client's fetch interceptor (main.js) receives the 426 and calls
 * location.reload(true) — so even if the user dismissed or removed the
 * update modal with a browser extension, the next API call forces a reload.
 *
 * ── How to deploy a breaking version ───────────────────────────────────────
 * 1. Bump version in public/version.json  (e.g. "1.0.4")
 * 2. Set MIN_CLIENT_VERSION = "1.0.4" in Netlify → Site config → Env vars
 * 3. Deploy — old clients silently reload on their next API call.
 *    Admins see the update banner (version-check.js).
 *
 * ── Excluded paths (no version check needed) ───────────────────────────────
 * - cp-proxy        : proxies cp-algorithms.com, no auth, called by iframe
 * - unsubscribe     : email unsubscribe link, no JS client
 * - morning/night-reminder, broadcast, trigger-broadcast : Netlify cron jobs
 */

function parseVersion(v) {
  const [major = 0, minor = 0, patch = 0] = String(v || '').split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

// Paths that should bypass version checking
const EXCLUDED = new Set([
  '/.netlify/functions/cp-proxy',
  '/.netlify/functions/unsubscribe',
  '/.netlify/functions/morning-reminder',
  '/.netlify/functions/night-reminder',
  '/.netlify/functions/broadcast',
  '/.netlify/functions/trigger-broadcast',
  '/.netlify/functions/clerk-config',
]);

export default async function handler(request, context) {
  const url = new URL(request.url);

  // Skip OPTIONS preflight — CORS headers are added by the function itself
  if (request.method === 'OPTIONS') return context.next();

  // Skip excluded paths
  if (EXCLUDED.has(url.pathname)) return context.next();

  const minVersion = Deno.env.get('MIN_CLIENT_VERSION') || '';

  // If no minimum is configured, skip enforcement (safe default during rollout)
  if (!minVersion || minVersion === '0.0.0') return context.next();

  const clientVersion = request.headers.get('x-client-version') || '';
  const origin        = request.headers.get('origin') || '*';

  const isOutdated = false; // Disabled by request:
    // !clientVersion ||
    // parseVersion(clientVersion) < parseVersion(minVersion);

  if (isOutdated) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Client outdated — reload required', reload: true }),
      {
        status: 426,
        headers: {
          'Content-Type'                : 'application/json',
          'Access-Control-Allow-Origin' : origin,
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Version',
        },
      }
    );
  }

  return context.next();
}

export const config = {
  path: '/.netlify/functions/*',
};
