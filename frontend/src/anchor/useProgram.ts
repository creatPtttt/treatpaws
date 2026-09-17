import { useMemo } from 'react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import idl from '../idl/pet_game.json';
import { PROGRAM_PUBKEY } from './pda';

/**
 * Builds an Anchor `Program` client bound to the connected wallet.
 * Returns `null` while no wallet is connected — callers must handle that
 * (see the RequireWallet / RequireAdmin route guards).
 */
export function useProgram(): Program | null {
  const { connection } = useConnection();
  // useAnchorWallet() adapts the wallet-adapter wallet into the
  // { publicKey, signTransaction, signAllTransactions } shape Anchor expects.
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    return new Program(idl as Idl, PROGRAM_PUBKEY, provider);
  }, [connection, wallet]);
}
