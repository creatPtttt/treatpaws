import { useCallback, useEffect, useState } from 'react';
import type { Program } from '@coral-xyz/anchor';
import { getGameConfigPda } from '../anchor/pda';
import { toGameConfigView, type GameConfigRaw, type GameConfigView } from '../anchor/types';
import { extractErrorMessage } from '../anchor/errors';

const REFRESH_INTERVAL_MS = 20_000;

interface UseGameConfigResult {
  gameConfig: GameConfigView | null;
  /** true once we know for sure GameConfig has never been created on-chain. */
  notInitialized: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Fetches the singleton GameConfig PDA, refreshing periodically. */
export function useGameConfig(program: Program | null): UseGameConfigResult {
  const [gameConfig, setGameConfig] = useState<GameConfigView | null>(null);
  const [notInitialized, setNotInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!program) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pda] = getGameConfigPda();
      const raw = (await program.account.gameConfig.fetchNullable(pda)) as GameConfigRaw | null;
      setGameConfig(raw ? toGameConfigView(raw) : null);
      setNotInitialized(raw === null);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  return { gameConfig, notInitialized, loading, error, refetch };
}
