import { useEffect, useMemo, useState } from 'react';
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

const ZERO_STATE: LiveRewardState = { pending: 0, boosted: false, boostRemainingSeconds: 0 };

/**
 * Mirrors the on-chain `calculate_pending_rewards` formula from lib.rs
 * entirely in whole-token units (the mint-decimals scale factor cancels out
 * of the ratio, so it never needs to be known here). Ticks every second so
 * the UI number climbs live without extra RPC calls.
 */
export function useLiveRewards(pet: PetView | null, gameConfig: GameConfigView | null): LiveRewardState {
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!pet || !gameConfig) return ZERO_STATE;

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
  }, [pet, gameConfig, nowSeconds]);
}
