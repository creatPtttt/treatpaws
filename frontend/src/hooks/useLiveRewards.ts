import { useEffect, useMemo, useState } from 'react';
import type { GameConfigView, PetView } from '../anchor/types';
import { calculatePendingReward, ZERO_REWARD_STATE, type LiveRewardState } from '../utils/rewards';

export type { LiveRewardState };

/**
 * Ticks once a second and re-derives one pet's live reward state from the
 * shared pure formula in `utils/rewards.ts` — no extra RPC calls, the UI
 * number just climbs locally between polls.
 */
export function useLiveRewards(pet: PetView | null, gameConfig: GameConfigView | null): LiveRewardState {
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!pet || !gameConfig) return ZERO_REWARD_STATE;
    return calculatePendingReward(pet, gameConfig, nowSeconds);
  }, [pet, gameConfig, nowSeconds]);
}
