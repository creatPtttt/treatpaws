import { useMemo } from 'react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection, type AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, type Transaction, type VersionedTransaction } from '@solana/web3.js';
import idl from '../idl/pet_game.json';
import { PROGRAM_PUBKEY } from './pda';

/**
 * Builds an Anchor `Program` client bound to the connected wallet.
 * Returns `null` while no wallet is connected — callers must handle that
 * (see the RequireWallet / RequireAdmin route guards).
 */
export function useProgram(): Program | null {
  // `connection` comes from `WalletContextProvider`'s `<ConnectionProvider>`,
  // which is already pointed at `VITE_SOLANA_RPC_URL` (see `config/env.ts`)
  // — every instruction sent through this Anchor `Program` therefore goes
  // through the same dedicated RPC as the rest of the app.
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

/**
 * A throwaway wallet that can never actually sign. Used only so Anchor can
 * build a `Program` for *read* RPCs on the public landing page, where a
 * trainer may not have connected Phantom yet.
 */
const READONLY_WALLET: AnchorWallet = {
  publicKey: PublicKey.default,
  signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T) => tx,
  signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]) => txs,
};

/** Read-only Anchor client that works without a connected wallet. */
export function useReadonlyProgram(): Program {
  const { connection } = useConnection();

  return useMemo(() => {
    const provider = new AnchorProvider(connection, READONLY_WALLET, { commitment: 'confirmed' });
    return new Program(idl as Idl, PROGRAM_PUBKEY, provider);
  }, [connection]);
}
