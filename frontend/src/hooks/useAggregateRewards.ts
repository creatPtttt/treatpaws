import { useEffect, useMemo, useState } from 'react';
import type { GameConfigView, PetView } from '../anchor/types';
import { calculatePendingReward } from '../utils/rewards';

/**
 * Sums live pending $TREAT across an arbitrary set of pets (e.g. everything
 * the connected wallet owns), ticking once a second — used by My
 * Sanctuary's "Total Unclaimed $TREAT" stat. Shares the exact same pure
 * formula as the per-card `useLiveRewards`, just reduced over a list.
 */
export function useAggregateRewards(pets: PetView[], gameConfig: GameConfigView | null): number {
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!gameConfig || pets.length === 0) return 0;
    return pets.reduce((sum, pet) => sum + calculatePendingReward(pet, gameConfig, nowSeconds).pending, 0);
  }, [pets, gameConfig, nowSeconds]);
}
