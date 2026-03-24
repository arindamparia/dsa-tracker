const PK = document.querySelector('meta[name="clerk-publishable-key"]')?.content || "";
const DOMAIN = document.querySelector('meta[name="clerk-domain"]')?.content || "";

async function loadClerk() {
  if (window._clerk) return window._clerk;

  if (!PK || PK.startsWith("REPLACE")) {
    window._clerk = null;
    return null;
  }

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
        s.setAttribute("data-clerk-publishable-key", PK);
        s.crossOrigin = "anonymous";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      loaded = true;
      break;
    } catch {
      // try next CDN
    }
  }

  if (!loaded || !window.Clerk) throw new Error("Failed to load Clerk JS from all sources");

  const clerk = window.Clerk;
  await clerk.load();
  window._clerk = clerk;
  return clerk;
}

export async function initAuth() {
  try {
    const clerk = await loadClerk();
    if (!clerk) return true;

    if (!clerk.user) {
      window.location.href = '/welcome.html';
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function getToken() {
  try {
    return (await window._clerk?.session?.getToken()) || "";
  } catch {
    return "";
  }
}

export function getUserEmail() {
  return (
    window._clerk?.user?.primaryEmailAddress?.emailAddress?.toLowerCase() || ""
  );
}

export function getUserName() {
  const u = window._clerk?.user;
  if (!u) return "";
  return u.fullName || u.firstName || getUserEmail().split("@")[0] || "";
}

export async function signOut() {
  try {
    await window._clerk?.signOut();
  } catch {}
  window.location.href = '/welcome.html';
}
