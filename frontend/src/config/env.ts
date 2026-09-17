// Runtime configuration read from Vite env vars, with safe fallbacks so the
// app never crashes just because a .env file is missing in a fresh clone.

/**
 * The wallet address allowed to open /admin. Set VITE_ADMIN_PUBKEY in
 * `frontend/.env` (see `.env.example`). Returns null when unset so guards
 * can show a "not configured" notice instead of a false Unauthorized.
 */
export function getAdminPubkey(): string | null {
  const fromEnv = import.meta.env.VITE_ADMIN_PUBKEY?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : null;
}
