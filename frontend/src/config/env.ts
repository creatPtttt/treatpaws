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

/**
 * The Solana RPC HTTP endpoint. Set `VITE_SOLANA_RPC_URL` in
 * `frontend/.env` (see `.env.example`) to a dedicated provider (e.g. a
 * Helius Devnet URL) — the public `api.devnet.solana.com` endpoint
 * aggressively rate-limits (429s), especially on batched calls like the
 * Island Log drawer's `getParsedTransactions`. Every RPC connection in the
 * app (`WalletContextProvider`, `useProgram`, `activity.ts`) must read the
 * endpoint from here so they can't silently drift back to the public RPC.
 */
export function getSolanaRpcUrl(): string {
  const fromEnv = import.meta.env.VITE_SOLANA_RPC_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'https://api.devnet.solana.com';
}

/**
 * Derives the matching wss:// endpoint for a given RPC HTTP(S) URL by
 * swapping the protocol — this is exactly what `@solana/web3.js`'s
 * `Connection` does internally when no explicit `wsEndpoint` is given, and
 * it happens to be exactly the pattern Helius (and most RPC providers) use
 * for their websocket endpoint too: same host/path/query, `ws(s)://`
 * instead of `http(s)://`. Deriving it explicitly here just keeps the
 * `ConnectionProvider` config self-documenting.
 */
export function getSolanaWsUrl(rpcUrl: string): string {
  return rpcUrl.replace(/^http/, 'ws');
}
