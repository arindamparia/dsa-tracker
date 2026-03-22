/**
 * Auth edge function — replaced by Clerk authentication.
 *
 * Previously: password-based auth with a cookie.
 * Now: Clerk JS handles authentication client-side.
 *   - Frontend loads Clerk JS (auth.js module), which redirects
 *     unauthenticated users to Clerk's hosted sign-in page.
 *   - All API functions verify Clerk Bearer tokens independently.
 *
 * This edge function is now a no-op pass-through.
 * It is kept so netlify.toml doesn't need changing for other rules,
 * but the [[edge_functions]] entry has been removed from netlify.toml.
 */
export default async function auth(_request, context) {
  return context.next();
}
