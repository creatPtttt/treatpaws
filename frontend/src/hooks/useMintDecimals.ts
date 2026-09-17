import { useEffect, useState } from 'react';
import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { TREAT_MINT } from '../data/chain';

/** Fallback used until the real value loads, or if the mint can't be read yet on Devnet. */
export const DEFAULT_TREAT_DECIMALS = 6;

/** Reads the $TREAT mint's decimals so whole-token amounts can be scaled to raw u64. */
export function useMintDecimals(connection: Connection): { decimals: number; loaded: boolean } {
  const [decimals, setDecimals] = useState(DEFAULT_TREAT_DECIMALS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMint(connection, new PublicKey(TREAT_MINT))
      .then((info) => {
        if (!cancelled) {
          setDecimals(info.decimals);
          setLoaded(true);
        }
      })
      .catch(() => {
        // Mint may not exist on Devnet yet — keep the fallback silently.
        if (!cancelled) setLoaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connection]);

  return { decimals, loaded };
}
