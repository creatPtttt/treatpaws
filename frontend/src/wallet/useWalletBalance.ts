import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

const LAMPORTS_PER_SOL = 1_000_000_000;
const REFRESH_INTERVAL_MS = 15_000;

/**
 * Reads the connected wallet's native SOL balance and keeps it fresh with a
 * periodic re-fetch. Returns `null` while disconnected or before the first
 * successful fetch — callers should render a loading placeholder for null.
 */
export function useWalletBalance(): number | null {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balanceSol, setBalanceSol] = useState<number | null>(null);

  useEffect(() => {
    // No wallet connected — nothing to show.
    if (!connected || !publicKey) {
      setBalanceSol(null);
      return;
    }

    let cancelled = false;

    const fetchBalance = async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) {
          setBalanceSol(lamports / LAMPORTS_PER_SOL);
        }
      } catch {
        // Devnet RPC hiccup — keep the last known balance instead of clearing it.
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connection, connected, publicKey]);

  return balanceSol;
}
