import type { GameConfigView } from '../anchor/types';

/** Mirrors `BPS_DENOMINATOR` in `lib.rs` — basis-point math denominator (10_000 = 100%). */
const BPS_DENOMINATOR = 10_000;

export interface TakeoverDetails {
  petId: number;
  petName: string;
  /** Base58 address of whoever now owns the pet. */
  buyerAddress: string;
  /** The exact price (lamports) the pet sold for — what the buyer paid. */
  priceLamports: number;
  /** Lamports actually credited to the previous owner's wallet (price minus protocol fee). */
  creditedLamports: number;
  /** Estimated net profit (lamports) vs. what the previous owner originally paid for this pet. */
  profitLamports: number;
}

/**
 * Derives the previous owner's proceeds + profit from a single number: the
 * price the pet just sold for. No historical "what did I pay for this"
 * tracking is needed — the on-chain pricing curve is a pure invariant:
 * every sale bumps `current_price` to `principal_paid * (1 + increment)`,
 * so the principal the *previous* owner paid is always recoverable by
 * inverting that same bump off the price it just sold for again.
 */
export function computeTakeoverFinancials(
  priceLamports: number,
  gameConfig: GameConfigView,
): { creditedLamports: number; profitLamports: number } {
  const feeLamports = Math.floor((priceLamports * gameConfig.feeBasisPoints) / BPS_DENOMINATOR);
  const creditedLamports = priceLamports - feeLamports;
  const principalLamports = priceLamports / (1 + gameConfig.priceIncrementBps / BPS_DENOMINATOR);
  const profitLamports = Math.max(0, creditedLamports - principalLamports);
  return { creditedLamports, profitLamports };
}

/** localStorage key prefix — snapshot is scoped per-wallet so switching wallets doesn't cross-contaminate. */
const SNAPSHOT_KEY_PREFIX = 'tp_owned_pet_ids_';

export type OwnedPetsSnapshot = Record<number, number>; // petId -> currentPriceLamports at last check

/** Best-effort read — corrupt/missing/blocked storage just means "no snapshot yet". */
export function readOwnedPetsSnapshot(walletAddress: string): OwnedPetsSnapshot {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY_PREFIX + walletAddress);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Best-effort write — private-browsing / storage-quota failures should never crash the app. */
export function writeOwnedPetsSnapshot(walletAddress: string, snapshot: OwnedPetsSnapshot): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY_PREFIX + walletAddress, JSON.stringify(snapshot));
  } catch {
    // Ignore — this is a "nice to have" welcome-back feature, not critical state.
  }
}
