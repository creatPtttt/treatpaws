// On-chain identifiers for the TreatPaws Anchor program (Solana Devnet).
// Keep this file in sync with the deployed program / mint if either changes.

/** Anchor program ID (Devnet). */
export const PROGRAM_ID = 'G3ZFUjFMtHqc6jY4J2QweMqDAgfMX2YQxhR7CmEK2DXe';

/** $TREAT SPL token mint address (Devnet). */
export const TREAT_MINT = '8mD9Vo3fZrtAUsnGsnqpuQrfM1W3zdrGAaKg7m6iVyfQ';

/** Builds a Solana Explorer link scoped to Devnet for an address/program/tx. */
export function explorerUrl(address: string, kind: 'address' | 'tx' = 'address'): string {
  return `https://explorer.solana.com/${kind}/${address}?cluster=devnet`;
}

// Core economy constants (mirrors GameConfig defaults in the Anchor program).
export const BASE_REWARD_PER_10_MIN = 100; // whole $TREAT, unboosted
export const BOOST_MULTIPLIER = 1.2; // +20% while a "Snack Boost" is active
export const FEED_COST_TREAT = 500; // whole $TREAT sunk per feed (24h boost)
export const BOOST_DURATION_HOURS = 24;
export const VAULT_RESERVE_TREAT = 10_000_000;
export const GENESIS_PET_COUNT = 10;
/** Seconds in one production interval (10 minutes) — matches lib.rs `INTERVAL_SECONDS`. */
export const INTERVAL_SECONDS = 600;
/** Default lamport price used by the /admin "Initialize Genesis Pets" action (0.01 SOL). */
export const DEFAULT_GENESIS_PRICE_LAMPORTS = 10_000_000;
