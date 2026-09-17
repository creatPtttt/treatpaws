import { useCallback, useEffect, useRef, useState } from 'react';
import type { Program } from '@coral-xyz/anchor';
import { getAllPetPdas } from '../anchor/pda';
import { toPetView, type PetRaw, type PetView } from '../anchor/types';
import { extractErrorMessage } from '../anchor/errors';

const REFRESH_INTERVAL_MS = 15_000;

interface UsePetsResult {
  /** null until the very first successful fetch resolves. */
  pets: PetView[] | null;
  notInitialized: boolean;
  /** true only for the very first fetch — drives full-page skeleton UI. */
  loading: boolean;
  /** true while a silent background poll is in flight after the first load. */
  isRefetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Fetches all 10 genesis Pet PDAs in a single batched RPC call. */
export function usePets(program: Program | null): UsePetsResult {
  const [pets, setPets] = useState<PetView[] | null>(null);
  const [notInitialized, setNotInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tracks whether we've completed at least one fetch — flips `loading`
  // off for good so periodic polling never re-triggers the skeleton UI and
  // unmounts already-rendered pet cards.
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
      // Keep whatever pets we already have on screen — a transient RPC
      // hiccup during a background poll shouldn't blank out live data.
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

  return { pets, notInitialized, loading, isRefetching, error, refetch };
}
