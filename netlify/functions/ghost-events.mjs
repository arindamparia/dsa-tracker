/**
 * Realtime "ghost replay finished" notifications over Pusher Channels.
 *
 * The background generator publishes a tiny status event when a replay is ready or has
 * failed; the browser subscribes and then re-fetches the actual replay from the
 * authenticated check-ghost-cache endpoint. No replay content ever travels through
 * Pusher, so the channel is public and needs no auth endpoint.
 *
 * Env (Netlify → Environment variables): PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER.
 * If any is missing everything here is a no-op and clients fall back to long-polling.
 */
import Pusher from "pusher";

export const GHOST_READY  = "ghost-ready";   // replay (or a not_found verdict) is in ghost_cache
export const GHOST_FAILED = "ghost-failed";  // generation failed — client should stop waiting

const PUBLISH_TIMEOUT_MS = 4000;

export const pusherConfigured = () =>
  !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER);

/** Public values the browser needs to subscribe (the key is not a secret). */
export const publicPusherConfig = () =>
  pusherConfigured() ? { key: process.env.PUSHER_KEY, cluster: process.env.PUSHER_CLUSTER } : null;

/** Pusher channel names allow only [A-Za-z0-9_\-=@,.;] — "C++" etc. must be mapped. */
export const ghostChannel = (lcNumber, language) =>
  `ghost-${String(lcNumber).replace(/[^A-Za-z0-9]/g, '')}-${String(language).toLowerCase().replace(/\+/g, 'p').replace(/#/g, 's').replace(/[^a-z0-9]/g, '_')}`;

let _pusher = null;
const getPusher = () => {
  if (!_pusher) {
    _pusher = new Pusher({
      appId:   process.env.PUSHER_APP_ID,
      key:     process.env.PUSHER_KEY,
      secret:  process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS:  true,
    });
  }
  return _pusher;
};

/** Best-effort publish. Never throws and never blocks the caller for long. */
export async function publishGhostEvent(lcNumber, language, event) {
  if (!pusherConfigured()) return false;
  try {
    await Promise.race([
      getPusher().trigger(ghostChannel(lcNumber, language), event, { lcNumber, language, at: Date.now() }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('pusher publish timed out')), PUBLISH_TIMEOUT_MS)),
    ]);
    return true;
  } catch (err) {
    console.error('ghost event publish failed:', err.message);
    return false;
  }
}
