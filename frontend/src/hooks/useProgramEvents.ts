import { useEffect, useRef } from 'react';
import type { PartiallyDecodedInstruction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Notification } from 'animal-island-ui';
import { PROGRAM_PUBKEY } from '../anchor/pda';
import type { GameConfigView, PetView } from '../anchor/types';
import { shortenAddress } from '../wallet/format';
import { computeTakeoverFinancials, type TakeoverDetails } from '../utils/takeover';

const BUY_PET_LOG_MARKER = 'Instruction: BuyPet';
const BUY_PET_RESULT_PATTERN = /Pet (\d+) bought for (\d+) lamports/;

// Matches the `.accounts({...})` order in buyPet's IDL entry — Anchor
// always serializes accounts in IDL-declared order regardless of the key
// order used when building the instruction client-side.
const BUY_PET_BUYER_ACCOUNT_INDEX = 0;
const BUY_PET_PREVIOUS_OWNER_ACCOUNT_INDEX = 2;

function isPartiallyDecoded(
  instruction: unknown,
): instruction is PartiallyDecodedInstruction {
  return !!instruction && typeof instruction === 'object' && 'accounts' in instruction && 'data' in instruction;
}

/**
 * Zero-HTTP-polling live event feed for /playpen. Subscribes ONCE to the
 * program's log stream over the wallet-adapter's existing WebSocket
 * connection (`connection.onLogs`) — no interval, no re-subscribing on
 * every render. When a BuyPet instruction is detected, makes exactly one
 * follow-up RPC call (fetching that single transaction) to learn who
 * bought/lost the pet and the exact sale price, then either:
 * - escalates to the full celebration modal (`onTakeoverDetected`) if the
 *   connected wallet was the previous owner, or
 * - shows a soft toast if someone else's pet just changed hands.
 * That one follow-up fetch is triggered by a genuine push event, never a
 * timer, so this stays "zero polling" in spirit even though it isn't
 * literally zero RPC calls.
 */
export function useProgramEvents(
  pets: PetView[] | null,
  gameConfig: GameConfigView | null,
  onTakeoverDetected: (details: TakeoverDetails) => void,
): void {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  // Read the latest wallet/pets/gameConfig/callback from inside the log
  // callback without forcing the subscription to tear down and recreate on
  // every render (wallet connect, poll tick, etc.).
  const publicKeyRef = useRef(publicKey);
  publicKeyRef.current = publicKey;
  const petsRef = useRef(pets);
  petsRef.current = pets;
  const gameConfigRef = useRef(gameConfig);
  gameConfigRef.current = gameConfig;
  const onTakeoverDetectedRef = useRef(onTakeoverDetected);
  onTakeoverDetectedRef.current = onTakeoverDetected;

  // onLogs can occasionally redeliver the same signature (e.g. reconnects) —
  // guard against double-alerting the same buyout.
  const seenSignaturesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const subscriptionId = connection.onLogs(
      PROGRAM_PUBKEY,
      ({ signature, err, logs }) => {
        if (err) return;
        if (!logs.some((line) => line.includes(BUY_PET_LOG_MARKER))) return;
        if (seenSignaturesRef.current.has(signature)) return;
        seenSignaturesRef.current.add(signature);

        const resultMatch = logs.map((line) => line.match(BUY_PET_RESULT_PATTERN)).find(Boolean);
        const petId = resultMatch ? Number(resultMatch[1]) : null;
        const priceLamports = resultMatch ? Number(resultMatch[2]) : null;

        void (async () => {
          try {
            const tx = await connection.getParsedTransaction(signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed',
            });
            const instruction = tx?.transaction.message.instructions.find(
              (candidate) => isPartiallyDecoded(candidate) && candidate.programId.equals(PROGRAM_PUBKEY),
            );
            if (!instruction || !isPartiallyDecoded(instruction)) return;

            const buyer = instruction.accounts[BUY_PET_BUYER_ACCOUNT_INDEX]?.toBase58();
            const previousOwner = instruction.accounts[BUY_PET_PREVIOUS_OWNER_ACCOUNT_INDEX]?.toBase58();
            const me = publicKeyRef.current?.toBase58();
            if (!me) return;

            if (previousOwner === me && petId !== null && priceLamports !== null) {
              const gameConfigNow = gameConfigRef.current;
              const petData = petsRef.current?.find((pet) => pet.id === petId);
              if (!gameConfigNow || !petData) return;

              const { creditedLamports, profitLamports } = computeTakeoverFinancials(
                priceLamports,
                gameConfigNow,
              );
              onTakeoverDetectedRef.current({
                petId,
                petName: petData.name,
                buyerAddress: buyer ?? 'unknown',
                priceLamports,
                creditedLamports,
                profitLamports,
              });
            } else if (buyer && buyer !== me) {
              Notification.info({
                message: `🐾 Pet #${petId ?? '?'} was snatched by ${shortenAddress(buyer)}!`,
                duration: 6,
              });
            }
            // buyer === me is our own just-confirmed action — the
            // transaction runner's own success toast already covers it, so
            // stay silent here to avoid a duplicate.
          } catch {
            // Best-effort feature: a failed follow-up fetch just means we
            // silently skip this one alert, never surfaced as an app error.
          }
        })();
      },
      'confirmed',
    );

    return () => {
      connection.removeOnLogsListener(subscriptionId);
    };
  }, [connection]);
}
