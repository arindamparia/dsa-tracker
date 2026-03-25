const CACHE_NAME = 'dsa-assets-v1';

export const BG_URL = 'https://res.cloudinary.com/dnju7wfma/image/upload/f_auto,q_auto,w_1920/bg_lnzb9t.png';

/**
 * Fetches a URL, caching the response in Cache API.
 * Returns a blob URL for use in CSS / Audio src.
 * Falls back to the original URL if Cache API is unavailable.
 */
async function getOrFetch(url) {
  if (!('caches' in window)) {
    // Cache API unavailable — fetch directly and return blob URL
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
    return URL.createObjectURL(await resp.blob());
  }

  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(url);

  // Discard opaque responses (status 0) — they have empty bodies
  if (!response || response.status === 0) {
    response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    await cache.put(url, response.clone());
  }

  return URL.createObjectURL(await response.blob());
}

/** Load & show the background image. Safe to call multiple times. */
export async function loadBgImage() {
  const root = document.documentElement;
  if (root.classList.contains('bg-loaded')) return true;

  try {
    const blobUrl = await getOrFetch(BG_URL);
    root.style.setProperty('--bg-image', `url('${blobUrl}')`);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.classList.add('bg-loaded'));
    });
    return true;
  } catch (err) {
    console.warn('Background image failed to load:', err);
    return false;
  }
}

/** Get a blob URL for an audio track, caching the file. */
export async function getAudioBlobUrl(url) {
  return getOrFetch(url);
}
