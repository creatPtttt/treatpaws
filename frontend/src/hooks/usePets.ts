import { useCallback, useEffect, useState } from 'react';
import type { Program } from '@coral-xyz/anchor';
import { getAllPetPdas } from '../anchor/pda';
import { toPetView, type PetRaw, type PetView } from '../anchor/types';
import { extractErrorMessage } from '../anchor/errors';

const REFRESH_INTERVAL_MS = 15_000;

interface UsePetsResult {
  /** null while loading OR when the game has never been initialized on-chain. */
  pets: PetView[] | null;
  notInitialized: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Fetches all 10 genesis Pet PDAs in a single batched RPC call. */
export function usePets(program: Program | null): UsePetsResult {
  const [pets, setPets] = useState<PetView[] | null>(null);
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
      const petPdas = getAllPetPdas();
      // fetchMultiple batches into one getMultipleAccountsInfo call and
      // returns `null` per-slot for accounts that don't exist yet, instead
      // of throwing — exactly what we need to detect "not initialized".
      const rawList = (await program.account.pet.fetchMultiple(petPdas)) as (PetRaw | null)[];
      const anyMissing = rawList.some((raw) => raw === null);

      if (anyMissing) {
        setPets(null);
        setNotInitialized(true);
      } else {
        setPets(rawList.map((raw, index) => toPetView(raw as PetRaw, petPdas[index].toBase58())));
        setNotInitialized(false);
      }
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

  return { pets, notInitialized, loading, error, refetch };
}
