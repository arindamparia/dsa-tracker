const COOKIE_NAME = "dsa_auth";
const LOGOUT_PATH = "/logout";
const LOGIN_ACTION = "/login";

function hashPassword(password) {
  // Simple deterministic token: base64 of password + salt
  // Edge runtime supports btoa
  return btoa(`dsa:${password}:tracker`);
}

function getLoginPage(error = "") {
  const errorHtml = error
    ? `<div class="error">${error}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>DSA Tracker — Access</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Syne:wght@700;800&display=swap" rel="stylesheet"/>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f; --surface: #111118; --surface2: #18181f;
    --border: #2a2a38; --border2: #363648;
    --text: #e8e8f0; --text-muted: #6b6b85;
    --accent: #7c6af7; --accent-glow: rgba(124,106,247,0.18);
    --hard: #ff4757;
  }
  body {
    background: var(--bg); color: var(--text);
    font-family: 'Syne', sans-serif;
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  body::before {
    content: ''; position: fixed; inset: 0;
    background-image: linear-gradient(var(--border) 1px, transparent 1px),
                      linear-gradient(90deg, var(--border) 1px, transparent 1px);
    background-size: 40px 40px; opacity: 0.25; pointer-events: none;
  }
  .card {
    position: relative; z-index: 1;
    background: var(--surface); border: 1px solid var(--border2);
    border-radius: 16px; padding: 48px 40px; width: 100%; max-width: 400px;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--accent-glow); border: 1px solid rgba(124,106,247,0.3);
    border-radius: 999px; padding: 4px 14px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase;
    margin-bottom: 20px;
  }
  .badge::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent); animation: blink 2s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
  h1 {
    font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px;
    background: linear-gradient(135deg, #fff 30%, var(--accent) 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .sub {
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    color: var(--text-muted); margin-bottom: 32px;
  }
  label {
    display: block; font-family: 'JetBrains Mono', monospace;
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--text-muted); margin-bottom: 8px;
  }
  input[type="password"] {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 12px 16px;
    font-family: 'JetBrains Mono', monospace; font-size: 14px;
    color: var(--text); outline: none; transition: border-color 0.2s;
    margin-bottom: 16px;
  }
  input[type="password"]:focus { border-color: var(--accent); }
  button {
    width: 100%; background: var(--accent); border: none; border-radius: 8px;
    padding: 13px; font-family: 'Syne', sans-serif; font-size: 14px;
    font-weight: 700; color: #fff; cursor: pointer; transition: background 0.2s;
  }
  button:hover { background: #9180ff; }
  .error {
    background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.3);
    border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;
    font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--hard);
  }
</style>
</head>
<body>
<div class="card">
  <div class="badge">Private Access</div>
  <h1>DSA Tracker</h1>
  <p class="sub">Enter password to continue</p>
  ${errorHtml}
  <form method="POST" action="${LOGIN_ACTION}">
    <label for="pw">Password</label>
    <input type="password" id="pw" name="password" placeholder="••••••••" autofocus autocomplete="current-password" required/>
    <button type="submit">Unlock →</button>
  </form>
</div>
</body>
</html>`;
}

export default async function auth(request, context) {
  const url = new URL(request.url);
  const sitePassword = Deno.env.get("SITE_PASSWORD");

  // ── No password set → pass through (dev mode) ────────────────────
  if (!sitePassword) {
    return context.next();
  }

  const validToken = hashPassword(sitePassword);

  // ── LOGOUT ────────────────────────────────────────────────────────
  if (url.pathname === LOGOUT_PATH) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Clear-Site-Data": '"cache", "cookies", "storage"',
      },
    });
  }

  // ── LOGIN POST ────────────────────────────────────────────────────
  if (url.pathname === LOGIN_ACTION && request.method === "POST") {
    const formData = await request.formData();
    const submitted = formData.get("password") || "";

    if (submitted === sitePassword) {
      // Correct — set cookie, redirect to home
      const redirectTo = url.searchParams.get("next") || "/";
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectTo,
          "Set-Cookie": `${COOKIE_NAME}=${validToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Wrong password — show form with error, never cache
    return new Response(getLoginPage("Incorrect password. Try again."), {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
      },
    });
  }

  // ── CHECK COOKIE on every other request ──────────────────────────
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const authCookie = cookies[COOKIE_NAME];

  // Valid token → let through
  if (authCookie === validToken) {
    const response = await context.next();
    // Vary: Cookie ensures the cached response is only served to authenticated requests.
    // Don't override Cache-Control — let each resource (HTML, API, assets) cache naturally.
    response.headers.set("Vary", "Cookie");
    return response;
  }

  // No/invalid cookie → show login page, never cache
  const loginHtml = getLoginPage();
  return new Response(loginHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
    },
  });
}
