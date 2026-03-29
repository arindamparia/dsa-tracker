let _pk = null;
let _allowAllUsers = null; // null = not yet fetched this page load
const PK_TTL = 5 * 60 * 1000;
const ALLOWED_EMAIL = "arindamparia321@gmail.com";

async function getConfig() {
  // pk is stable (never changes), cache it. allowAllUsers can change on redeploy — always fetch fresh.
  if (_pk !== null && _allowAllUsers !== null) return { pk: _pk, allowAllUsers: _allowAllUsers };

  // Restore pk from sessionStorage (stable across deploys)
  if (_pk === null) {
    try {
      const cached = JSON.parse(sessionStorage.getItem('_cpk') || 'null');
      if (cached?.pk && (Date.now() - cached.t < PK_TTL)) _pk = cached.pk;
    } catch {}
  }

  // Always fetch from server — needed to get fresh allowAllUsers, and pk if not cached
  try {
    const res = await fetch("/.netlify/functions/clerk-config");
    const data = await res.json();
    _allowAllUsers = data.allowAllUsers ?? false;
    if (!_pk) {
      _pk = data.pk || "";
      if (_pk) sessionStorage.setItem('_cpk', JSON.stringify({ pk: _pk, t: Date.now() }));
    }
  } catch {
    if (_pk === null) _pk = "";
    if (_allowAllUsers === null) _allowAllUsers = false;
  }

  return { pk: _pk, allowAllUsers: _allowAllUsers };
}

async function getPublishableKey() {
  return (await getConfig()).pk;
}

async function loadClerk() {
  if (window._clerk) return window._clerk;

  const PK = await getPublishableKey();
  if (!PK || PK.startsWith("REPLACE")) {
    window._clerk = null;
    return null;
  }

  try {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js";
      s.setAttribute("data-clerk-publishable-key", PK);
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  } catch {
    throw new Error("Failed to load Clerk JS");
  }

  if (!window.Clerk) throw new Error("Clerk JS not available");

  const clerk = window.Clerk;
  await clerk.load({ touchSession: false });
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

    // Access control — check if this user is allowed
    const { allowAllUsers } = await getConfig();
    const email = clerk.user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
    if (!allowAllUsers && email !== ALLOWED_EMAIL) {
      // Sign them out silently then redirect to the access-denied page
      try { await clerk.signOut(); } catch {}
      window.location.href = '/not-allowed.html';
      return false;
    }

    return true;
  } catch {
    window.location.href = '/welcome.html';
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
