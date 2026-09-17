import { useCallback, useEffect, useState } from 'react';
import type { Connection } from '@solana/web3.js';
import { getVaultPda } from '../anchor/pda';

const REFRESH_INTERVAL_MS = 15_000;

export interface VaultBalance {
  /** Raw token units remaining in the Vault PDA, or null if it doesn't exist yet. */
  rawAmount: bigint | null;
  /** UI (whole-token) amount, or null if the vault account isn't on-chain. */
  uiAmount: number | null;
  /** Exact UI amount string from RPC — safer than float for filling the Max input. */
  uiAmountString: string | null;
  /** true after the first fetch attempt, even if the vault is missing. */
  loaded: boolean;
  refetch: () => Promise<void>;
}

/**
 * Reads the Vault PDA's $TREAT token balance and keeps it fresh. Returns
 * null amounts until `initialize_game` has created the token account.
 */
export function useVaultBalance(connection: Connection): VaultBalance {
  const [rawAmount, setRawAmount] = useState<bigint | null>(null);
  const [uiAmount, setUiAmount] = useState<number | null>(null);
  const [uiAmountString, setUiAmountString] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refetch = useCallback(async () => {
    const [vault] = getVaultPda();
    try {
      const info = await connection.getTokenAccountBalance(vault);
      setRawAmount(BigInt(info.value.amount));
      setUiAmount(info.value.uiAmount);
      setUiAmountString(info.value.uiAmountString ?? null);
    } catch {
      // Vault PDA token account doesn't exist until initialize_game.
      setRawAmount(null);
      setUiAmount(null);
      setUiAmountString(null);
    } finally {
      setLoaded(true);
    }
  }, [connection]);

  useEffect(() => {
    void refetch();
    const interval = setInterval(() => {
      void refetch();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetch]);

  return { rawAmount, uiAmount, uiAmountString, loaded, refetch };
}
