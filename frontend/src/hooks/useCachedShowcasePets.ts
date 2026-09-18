import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useReadonlyProgram } from '../anchor/useProgram';
import { getAllPetPdas } from '../anchor/pda';
import type { PetRaw } from '../anchor/types';
import { readSessionCache, writeSessionCache } from '../utils/sessionCache';

const CACHE_KEY = 'treatpaws.landing.pets.v1';
const UNOWNED = PublicKey.default.toBase58();

/** JSON-safe pet snapshot stored in sessionStorage for the landing showcase. */
export interface CachedShowcasePet {
  id: number;
  name: string;
  currentPriceLamports: number;
  owner: string;
  isInitialized: boolean;
}

function isAvailable(pet: CachedShowcasePet): boolean {
  return !pet.isInitialized || pet.owner === UNOWNED;
}

/**
 * All 10 genesis pets for the marketing grid. A 2-minute sessionStorage
 * cache means a reload inside that window never hits RPC.
 */
export function useCachedShowcasePets(): {
  pets: CachedShowcasePet[];
  loading: boolean;
} {
  const program = useReadonlyProgram();
  const initial = readSessionCache<CachedShowcasePet[]>(CACHE_KEY);
  const [pets, setPets] = useState<CachedShowcasePet[]>(initial ?? []);
  const [loading, setLoading] = useState(initial == null);

  useEffect(() => {
    const cached = readSessionCache<CachedShowcasePet[]>(CACHE_KEY);
    if (cached) {
      setPets(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPets = async () => {
      try {
        const petPdas = getAllPetPdas();
        const rawList = (await program.account.pet.fetchMultiple(petPdas)) as (PetRaw | null)[];
        if (cancelled) return;
        const next: CachedShowcasePet[] = [];
        rawList.forEach((raw, index) => {
          if (!raw) return;
          next.push({
            id: raw.id || index + 1,
            name: raw.name,
            currentPriceLamports: raw.currentPrice.toNumber(),
            owner: raw.owner.toBase58(),
            isInitialized: raw.isInitialized,
          });
        });
        writeSessionCache(CACHE_KEY, next);
        setPets(next);
      } catch {
        if (!cancelled) setPets([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchPets();
    return () => {
      cancelled = true;
    };
  }, [program]);

  return { pets, loading };
}

export { isAvailable };
