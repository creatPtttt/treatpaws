import { useEffect, useRef } from 'react';
import type { PublicKey } from '@solana/web3.js';
import type { GameConfigView, PetView } from '../anchor/types';
import {
  computeTakeoverFinancials,
  readOwnedPetsSnapshot,
  writeOwnedPetsSnapshot,
  type TakeoverDetails,
} from '../utils/takeover';

/**
 * "Welcome back" offline takeover detection. Every time `pets` refreshes we
 * snapshot { petId -> currentPriceLamports } for everything the connected
 * wallet owns into localStorage. The very first time a given wallet is
 * seen this session, we diff that fresh snapshot against whatever was
 * saved from a previous visit — any pet id that's present in the old
 * snapshot but missing from the new one was bought out while this tab
 * wasn't open (and therefore never got the live WebSocket toast/modal).
 *
 * Only that first-per-wallet check ever fires `onTakeoverDetected` — every
 * later poll this session just keeps the snapshot fresh silently, since
 * `useProgramEvents`'s live WebSocket subscription already covers buyouts
 * that happen while the tab is open (firing this too would double-alert).
 */
export function useOfflineTakeoverDetection(
  pets: PetView[] | null,
  gameConfig: GameConfigView | null,
  publicKey: PublicKey | null,
  onTakeoverDetected: (details: TakeoverDetails) => void,
): void {
  const checkedWalletRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pets || !gameConfig || !publicKey) return;

    const wallet = publicKey.toBase58();
    const currentSnapshot: Record<number, number> = {};
    for (const pet of pets) {
      if (pet.owner === wallet) currentSnapshot[pet.id] = pet.currentPriceLamports;
    }

    if (checkedWalletRef.current !== wallet) {
      checkedWalletRef.current = wallet;

      const previousSnapshot = readOwnedPetsSnapshot(wallet);
      for (const [petIdRaw, priceLamports] of Object.entries(previousSnapshot)) {
        const petId = Number(petIdRaw);
        if (petId in currentSnapshot) continue; // still mine — nothing happened

        const currentPetData = pets.find((pet) => pet.id === petId);
        if (!currentPetData) continue; // shouldn't happen (10 genesis pets always exist), but stay safe

        const { creditedLamports, profitLamports } = computeTakeoverFinancials(priceLamports, gameConfig);
        onTakeoverDetected({
          petId,
          petName: currentPetData.name,
          buyerAddress: currentPetData.owner,
          priceLamports,
          creditedLamports,
          profitLamports,
        });
      }
    }

    writeOwnedPetsSnapshot(wallet, currentSnapshot);
  }, [pets, gameConfig, publicKey, onTakeoverDetected]);
}
