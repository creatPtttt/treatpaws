import type { GameConfigView, PetView } from '../anchor/types';
import { INTERVAL_SECONDS } from '../data/chain';

export interface LiveRewardState {
  /** Pending $TREAT accrued since last claim, in whole tokens (fractional). */
  pending: number;
  /** Whether the Snack Boost is active right now. */
  boosted: boolean;
  /** Seconds remaining on the boost (0 if inactive). */
  boostRemainingSeconds: number;
}

export const ZERO_REWARD_STATE: LiveRewardState = { pending: 0, boosted: false, boostRemainingSeconds: 0 };

/**
 * Pure port of the on-chain `calculate_pending_rewards` formula from lib.rs,
 * entirely in whole-token units (the mint-decimals scale factor cancels out
 * of the ratio, so it never needs to be known here). Extracted out of
 * `useLiveRewards` so both a single-pet ticking hook AND an aggregate
 * (multi-pet sum, e.g. My Sanctuary's "Total Unclaimed $TREAT") can share
 * the exact same math instead of two copies drifting apart.
 */
export function calculatePendingReward(
  pet: PetView,
  gameConfig: GameConfigView,
  nowSeconds: number,
): LiveRewardState {
  const { lastClaimTimestamp, boostUntilTimestamp } = pet;
  const elapsed = Math.max(0, nowSeconds - lastClaimTimestamp);

  const boostedSeconds =
    boostUntilTimestamp > lastClaimTimestamp
      ? Math.max(0, Math.min(boostUntilTimestamp, nowSeconds) - lastClaimTimestamp)
      : 0;
  const regularSeconds = elapsed - boostedSeconds;

  const pending =
    (gameConfig.boostRewardRate * boostedSeconds + gameConfig.baseRewardRate * regularSeconds) /
    INTERVAL_SECONDS;

  const boosted = nowSeconds < boostUntilTimestamp;
  const boostRemainingSeconds = boosted ? boostUntilTimestamp - nowSeconds : 0;

  return { pending, boosted, boostRemainingSeconds };
}
