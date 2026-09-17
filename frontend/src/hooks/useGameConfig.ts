import { useCallback, useEffect, useRef, useState } from 'react';
import type { Program } from '@coral-xyz/anchor';
import { getGameConfigPda } from '../anchor/pda';
import { toGameConfigView, type GameConfigRaw, type GameConfigView } from '../anchor/types';
import { extractErrorMessage } from '../anchor/errors';

const REFRESH_INTERVAL_MS = 20_000;

interface UseGameConfigResult {
  gameConfig: GameConfigView | null;
  /** true once we know for sure GameConfig has never been created on-chain. */
  notInitialized: boolean;
  /** true only for the very first fetch — drives full-page skeleton UI. */
  loading: boolean;
  /** true while a silent background poll is in flight after the first load. */
  isRefetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Fetches the singleton GameConfig PDA, refreshing periodically. */
export function useGameConfig(program: Program | null): UseGameConfigResult {
  const [gameConfig, setGameConfig] = useState<GameConfigView | null>(null);
  const [notInitialized, setNotInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Flips permanently true after the first fetch so periodic polling never
  // re-triggers `loading` (and the skeleton UI it drives) again.
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }

    if (hasLoadedOnceRef.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }

    try {
      const [pda] = getGameConfigPda();
      const raw = (await program.account.gameConfig.fetchNullable(pda)) as GameConfigRaw | null;
      setGameConfig(raw ? toGameConfigView(raw) : null);
      setNotInitialized(raw === null);
      setError(null);
    } catch (err) {
      // Keep the last known-good config on screen through a transient
      // background-poll failure instead of blanking it out.
      setError(extractErrorMessage(err));
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
      setIsRefetching(false);
    }
  }, [program]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  return { gameConfig, notInitialized, loading, isRefetching, error, refetch };
}
