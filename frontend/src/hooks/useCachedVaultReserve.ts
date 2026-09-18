import { useEffect, useState } from 'react';
import type { Connection } from '@solana/web3.js';
import { getVaultPda } from '../anchor/pda';
import { readSessionCache, writeSessionCache } from '../utils/sessionCache';

const CACHE_KEY = 'treatpaws.landing.vaultReserve.v1';

export interface VaultReserveCache {
  uiAmount: number | null;
  uiAmountString: string | null;
}

/**
 * Landing-page Treat Vault balance. Serves a 2-minute sessionStorage cache
 * immediately and skips RPC entirely on a cache hit (including full reloads).
 */
export function useCachedVaultReserve(connection: Connection): {
  uiAmount: number | null;
  uiAmountString: string | null;
  loaded: boolean;
} {
  const initial = readSessionCache<VaultReserveCache>(CACHE_KEY);
  const [uiAmount, setUiAmount] = useState<number | null>(initial?.uiAmount ?? null);
  const [uiAmountString, setUiAmountString] = useState<string | null>(initial?.uiAmountString ?? null);
  const [loaded, setLoaded] = useState(initial !== null);

  useEffect(() => {
    const cached = readSessionCache<VaultReserveCache>(CACHE_KEY);
    if (cached) {
      setUiAmount(cached.uiAmount);
      setUiAmountString(cached.uiAmountString);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      const [vault] = getVaultPda();
      try {
        const info = await connection.getTokenAccountBalance(vault);
        if (cancelled) return;
        const next: VaultReserveCache = {
          uiAmount: info.value.uiAmount,
          uiAmountString: info.value.uiAmountString ?? null,
        };
        writeSessionCache(CACHE_KEY, next);
        setUiAmount(next.uiAmount);
        setUiAmountString(next.uiAmountString);
      } catch {
        if (cancelled) return;
        // Vault PDA does not exist until initialize_game — remember the empty
        // result so a missing account doesn't get re-queried on every reload.
        const empty: VaultReserveCache = { uiAmount: null, uiAmountString: null };
        writeSessionCache(CACHE_KEY, empty);
        setUiAmount(null);
        setUiAmountString(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    void fetchBalance();
    return () => {
      cancelled = true;
    };
  }, [connection]);

  return { uiAmount, uiAmountString, loaded };
}

/** Formats a vault UI amount as `10,000,000 $TREAT`. */
export function formatTreatReserve(uiAmount: number | null, uiAmountString: string | null): string {
  const raw = uiAmountString != null ? Number(uiAmountString) : uiAmount;
  if (raw == null || !Number.isFinite(raw)) return '0 $TREAT';
  const isWhole = Math.abs(raw - Math.round(raw)) < 1e-6;
  const display = isWhole ? Math.round(raw) : raw;
  return `${display.toLocaleString(undefined, { maximumFractionDigits: 2 })} $TREAT`;
}
