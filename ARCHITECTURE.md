# AlgoTracker Architecture

Look, I didn't want to overcomplicate this with React, Next.js, or some massive Webpack bundler that takes 40 seconds to compile every time I hit save. We're building a tool to track data structures and algorithms, not a bloated enterprise SaaS.

This entire app is built on **Vanilla JS (ES Modules), raw CSS, and HTML**. It's fast, it consistently hits 100 on Lighthouse, and it works completely offline. Yes, it's a bit of a pure *jugaad* setup, and yes, I absolutely relied on AI to help me write the boilerplate and debug weird Chromium compositing quirks so I could go drink chai. But the core logic is rock-solid, deeply intentional, and brutally minimal.

Here is exactly how this whole khichdi is wired together so you don't get lost.

---

## 1. The Core Philosophy
1. **Zero Build Step**: If you can't run it locally by just opening `index.html` via Live Server, the architecture has failed. 
2. **Offline First**: The Service Worker caches everything aggressively. The app must function seamlessly even if the user goes through a tunnel on a train.
3. **Bare Metal Performance**: We manually batch DOM updates using `requestAnimationFrame` and `Lenis` for smooth scrolling. We don't rely on a virtual DOM to save us from our own bad code.

---

## 2. The Frontend (No Frameworks, Just Vibes)

The frontend is broken down into native ES modules. We rely on the browser's native module loader instead of a bundler. 

- **`public/index.html`**: The entry point. We inline critical CSS directly into the `<head>` because waiting for network requests to render a loading screen defeats the entire purpose of a loading screen.
- **`public/js/main.js`**: The central nervous system. This orchestrates the UI state, intercepts scrolling events to prevent jank on cheap Windows machines, and defers loading heavy CSS files until *after* the first paint.
- **`public/js/auth.js`**: The Clerk SDK wrapper. Clerk is amazing, but their JS SDK sometimes thinks mobile PWAs are native iOS apps and throws weird header conflicts (`Origin` vs `Authorization`). We explicitly force it into standard browser mode here. Don't touch this unless you enjoy debugging CORS errors at 3 AM IST.
- **`public/js/ambient.js`**: The Ambient Audio Player. This uses the raw Web Audio API and an FFT Analyser to create dynamic, reactive waveforms for the music player. I spent way too long tuning the frequencies to separate drum hits from background drones.
- **`public/js/cp-resources.js`**: Handles the CP-Algorithms integration and markdown rendering. AI definitely helped me write the `mammoth.js` wrapper here because parsing raw DOCX files natively in the browser is literal nightmare fuel.

---

## 3. The Backend (Netlify Serverless)

We use Netlify Functions for the backend. It's cheap, it scales infinitely, and it means I never have to set up a Docker container.

- **`netlify/functions/cp-proxy.mjs`**: The Glorious CORS Hack (Peak Jugaad). We proxy requests to `cp-algorithms.com` server-side so we can render their documentation natively inside our app. This bypasses their `X-Frame-Options` blocks and allows us to aggressively strip out their heavy MkDocs SPA JavaScript bundles while keeping the CSS and MathJax intact.
- **`netlify/functions/clerk-auth.mjs`**: The bouncer. Every sensitive database request goes through this JWT verification middleware to make sure a user isn't spoofing requests to wipe someone else's progress.

---

## 4. Background Jobs & Database

- **PostgreSQL (`db.mjs`)**: Used exclusively via Neon serverless. 
- **`netlify/functions/night-reminder.mjs` & `morning-reminder.mjs`**: These are Netlify Cron jobs that fire at specific times via GitHub Actions / Netlify schedules. They run massive bulk queries (like lateral joins) to calculate user progress and send out Resend emails. I learned the hard way to build all the email templates in memory and avoid running `N` database queries in a `for` loop.

---

## 5. Storage & Caching Strategy

- **IndexedDB / LocalStorage**: All the user's progress, question metadata, and custom notes are cached locally first. This makes the UI feel absolutely instant. The server is updated in the background asynchronously via debounce functions.
- **Service Worker (`public/sw.js`)**: Handles the PWA caching. It runs a strict "Network-First, Cache-Fallback" strategy for HTML files to ensure users always get the latest deploy, but aggressively caches static assets. 
  > [!WARNING]
  > If you change a major structural file or add a new CSS asset, you **MUST** bump the `CACHE_NAME` in `sw.js` (e.g., from `v3` to `v4`). If you don't, users will be stuck on the old cached version forever and will flood the Discord with bug reports.

---

## Contributing (The Desi Developer Code)

If you want to add a feature:
1. **Keep it Vanilla**. Do not submit a PR with `npm install react` or some heavy UI component library like we are building a massive TCS enterprise portal. Use modern browser APIs. 
2. **If it looks like AI wrote the comment, it probably did**. I used AI heavily to write out the docstrings and format the code because I was exhausted and running on Maggi and chai. But the underlying architecture and performance tweaks are intentional. Don't remove the hacky BFCache fixes or the Chrome scroll compositor overrides unless you actually know what they do.
3. **Test it on a bad laptop**. If it causes frame drops on an old Windows machine, bhai, you need to optimize your DOM repaints.

Break things, fix them, submit a PR.
