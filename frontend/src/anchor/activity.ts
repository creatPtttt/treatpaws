import type { Connection, ParsedTransactionWithMeta, PartiallyDecodedInstruction } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { Idl } from '@coral-xyz/anchor';
import { BorshInstructionCoder } from '@coral-xyz/anchor';
import type { LucideIcon } from 'lucide-react';
import { Building2, Coins, Crown, HelpCircle, PawPrint, SlidersHorizontal, Tag, Utensils, Vault } from 'lucide-react';
import idl from '../idl/pet_game.json';
import { PROGRAM_PUBKEY } from './pda';
import { getCreature } from '../data/creatures';
import type { PetView } from './types';
import { DEFAULT_TREAT_DECIMALS } from '../hooks/useMintDecimals';
import { BOOST_DURATION_HOURS, FEED_COST_TREAT } from '../data/chain';

/**
 * A single inline-styled piece of a narrative activity row �?see
 * `ActivityDrawer`'s renderer for how each `kind` maps to a visual style
 * (shortened monospace address badge, bold caramel pet name, colored SOL/
 * $TREAT pill, etc).
 */
export type ActivityHighlightPart =
  | { kind: 'text'; text: string }
  | { kind: 'address'; address: string }
  | { kind: 'pet'; label: string }
  | { kind: 'sol'; amount: number; direction: 'gain' | 'spend' }
  | { kind: 'treat'; amount: number; direction: 'gain' | 'spend' };

export interface ActivityEntry {
  signature: string;
  actionLabel: string;
  icon: LucideIcon;
  /** Per-action tint applied to the icon so the timeline reads at a glance. */
  color: string;
  /** Unix seconds, or null if the RPC hadn't attached a block time yet. */
  blockTime: number | null;
  success: boolean;
  /**
   * Rich "who / which pet / how much" narrative pieces, e.g.
   * `7xK�?np8 snatched Boba (#2) from 3fT�?qz1 for 0.0117 SOL`. `null` when
   * deep parsing wasn't possible (an older/corrupted transaction, or one
   * from an instruction we don't recognize) �?the UI falls back to just
   * showing `actionLabel` in that case, never a crash.
   */
  detail: ActivityHighlightPart[] | null;
}

interface ActionClassification {
  label: string;
  icon: LucideIcon;
  color: string;
}

// Anchor's generated instruction dispatcher always logs
// "Program log: Instruction: <PascalCaseName>" as the first line of a
// successful call �?the name is just the Rust instruction fn name
// (`buy_pet`) converted to PascalCase (`BuyPet`). Match case-insensitively
// against that PascalCase name so the parser stays robust to any
// surrounding whitespace/formatting quirks across RPC providers, rather
// than requiring an exact full-line match.
const ACTION_BY_INSTRUCTION_NAME: { pattern: RegExp; classification: ActionClassification }[] = [
  {
    pattern: /Instruction:\s*BuyPet\b/i,
    classification: { label: 'Pet Snatched', icon: PawPrint, color: '#d97706' }, // warm amber
  },
  {
    pattern: /Instruction:\s*ClaimCoins\b/i,
    classification: { label: 'Harvested $TREAT', icon: Coins, color: '#eab308' }, // golden yellow
  },
  {
    pattern: /Instruction:\s*FeedPet\b/i,
    classification: { label: 'Fed Snack (Boosted)', icon: Utensils, color: '#b45309' }, // warm caramel
  },
  {
    pattern: /Instruction:\s*RenamePet\b/i,
    classification: { label: 'Renamed Pet', icon: Tag, color: '#2f9e6c' }, // mint green
  },
  {
    pattern: /Instruction:\s*DepositVault\b/i,
    classification: { label: 'Vault Restocked', icon: Vault, color: '#8b5e34' }, // warm wood brown
  },
  {
    pattern: /Instruction:\s*WithdrawVault\b/i,
    classification: { label: 'Vault Withdrawal', icon: Building2, color: '#6b7280' }, // slate
  },
  {
    pattern: /Instruction:\s*InitializeGame\b/i,
    classification: { label: 'Genesis Launch', icon: Crown, color: '#dc2626' }, // fiery crown
  },
  {
    pattern: /Instruction:\s*UpdateGameConfig\b/i,
    classification: { label: 'Config Tuned', icon: SlidersHorizontal, color: '#7c6f57' }, // muted admin brown
  },
];

// Only used when the log truly doesn't match any known instruction (a
// program upgrade added a new one we haven't classified yet) �?NOT when a
// transaction merely fails to fetch, see `fetchParsedTransactionsWithLimit`.
const FALLBACK_CLASSIFICATION: ActionClassification = {
  label: 'Other Activity',
  icon: HelpCircle,
  color: '#9ca3af',
};

function classifyAction(logs: string[] | null | undefined): ActionClassification {
  const lines = logs ?? [];
  for (const { pattern, classification } of ACTION_BY_INSTRUCTION_NAME) {
    if (lines.some((line) => pattern.test(line))) return classification;
  }
  return FALLBACK_CLASSIFICATION;
}

// ---------------------------------------------------------------------------
// Rich narrative extraction
// ---------------------------------------------------------------------------

/** Decodes our own program's instructions (`BuyPet`, `RenamePet`, ...) out of raw tx bytes. */
const INSTRUCTION_CODER = new BorshInstructionCoder(idl as Idl);

// A couple of numeric details (the exact SOL price paid on a buyout, the
// exact $TREAT amount a claim paid out) are computed on-chain rather than
// passed in as instruction args, so the only place they appear is in the
// program's own `msg!()` logs. Everything else (pet id, new pet name,
// deposit/withdraw amount) IS a real instruction arg and is decoded via
// `INSTRUCTION_CODER` instead of log scraping.
const BUY_PET_LOG_PATTERN = /Pet \d+ bought for (\d+) lamports/;
const CLAIM_COINS_LOG_PATTERN = /Claimed (\d+) raw \$GAME for pet \d+/;

function isPartiallyDecoded(instruction: unknown): instruction is PartiallyDecodedInstruction {
  return !!instruction && typeof instruction === 'object' && 'accounts' in instruction && 'data' in instruction;
}

function findOwnProgramInstruction(tx: ParsedTransactionWithMeta): PartiallyDecodedInstruction | null {
  const instruction = tx.transaction.message.instructions.find(
    (candidate) => isPartiallyDecoded(candidate) && candidate.programId.equals(PROGRAM_PUBKEY),
  );
  return instruction && isPartiallyDecoded(instruction) ? instruction : null;
}

function decodeOwnInstruction(instruction: PartiallyDecodedInstruction): { name: string; data: Record<string, unknown> } | null {
  try {
    const decoded = INSTRUCTION_CODER.decode(instruction.data, 'base58');
    if (!decoded) return null;
    return decoded as { name: string; data: Record<string, unknown> };
  } catch {
    return null;
  }
}

/** The on-chain default name set by `initialize_game` before any `rename_pet` call. */
function isDefaultPetName(name: string, petId: number): boolean {
  return name === `Pet #${petId}`;
}

/**
 * Resolves the display name for a narrative row: prefers the pet's live
 * on-chain `name` (so a rename like "Shiba King" shows up immediately)
 * and only falls back to the static petdex `creature.displayName` (e.g.
 * "Shiba") when the pet hasn't been renamed yet, isn't initialized, or
 * `pets` wasn't loaded in time for this fetch.
 */
function petLabel(petId: number, pets: PetView[] | null): string {
  const onChainPet = pets?.find((pet) => pet.id === petId);
  const name =
    onChainPet && onChainPet.isInitialized && !isDefaultPetName(onChainPet.name, petId)
      ? onChainPet.name
      : getCreature(petId).displayName;
  return `${name} (#${petId})`;
}

/**
 * Accepts either a plain number/numeric-string (from a log line match) or
 * Anchor's `BN` (u64 instruction args decode to `BN`) and scales by mint
 * decimals. Routed through the global `String()` (which triggers `BN`'s own
 * `toString()` under the hood) rather than an `instanceof BN` check, since
 * that narrowing doesn't play nicely with anchor's re-exported `BN` type.
 */
function rawToTreatAmount(raw: unknown, decimals: number): number {
  return Number(String(raw)) / 10 ** decimals;
}

/**
 * Builds the rich "who / which pet / how much" narrative for one
 * transaction. Every accessor here is defensive �?any missing account,
 * unparseable log line, or unrecognized instruction just returns `null` so
 * the caller falls back to the plain `actionLabel` badge instead of
 * throwing and breaking the whole drawer.
 */
function buildActivityDetail(
  tx: ParsedTransactionWithMeta,
  decimals: number,
  pets: PetView[] | null,
): ActivityHighlightPart[] | null {
  try {
    const instruction = findOwnProgramInstruction(tx);
    if (!instruction) return null;
    const decoded = decodeOwnInstruction(instruction);
    if (!decoded) return null;

    // Every one of our instructions puts its primary actor (buyer, pet
    // owner, depositor, admin �?whoever signed to make this happen) as the
    // very first account (see the IDL's `accounts` order for each ix).
    const actorAddress = instruction.accounts[0]?.toBase58();
    if (!actorAddress) return null;
    const logs = tx.meta?.logMessages ?? [];

    switch (decoded.name) {
      case 'buyPet': {
        const petId = Number(decoded.data.petId);
        // buyPet's accounts are [buyer, admin, previousOwner, ...] �?see IDL.
        const previousOwnerAddress = instruction.accounts[2]?.toBase58();
        const priceMatch = logs.map((line) => line.match(BUY_PET_LOG_PATTERN)).find(Boolean);
        if (!previousOwnerAddress || !priceMatch) return null;
        const priceSol = Number(priceMatch[1]) / LAMPORTS_PER_SOL;
        return [
          { kind: 'address', address: actorAddress },
          { kind: 'text', text: ' snatched ' },
          { kind: 'pet', label: petLabel(petId, pets) },
          { kind: 'text', text: ' from ' },
          { kind: 'address', address: previousOwnerAddress },
          { kind: 'text', text: ' for ' },
          { kind: 'sol', amount: priceSol, direction: 'gain' },
        ];
      }
      case 'claimCoins': {
        const petId = Number(decoded.data.petId);
        const claimMatch = logs.map((line) => line.match(CLAIM_COINS_LOG_PATTERN)).find(Boolean);
        if (!claimMatch) return null;
        const treatAmount = rawToTreatAmount(claimMatch[1], decimals);
        return [
          { kind: 'address', address: actorAddress },
          { kind: 'text', text: ' harvested ' },
          { kind: 'treat', amount: treatAmount, direction: 'gain' },
          { kind: 'text', text: ' from ' },
          { kind: 'pet', label: petLabel(petId, pets) },
        ];
      }
      case 'feedPet': {
        const petId = Number(decoded.data.petId);
        return [
          { kind: 'address', address: actorAddress },
          { kind: 'text', text: ' fed ' },
          { kind: 'pet', label: petLabel(petId, pets) },
          { kind: 'text', text: ' with ' },
          { kind: 'treat', amount: FEED_COST_TREAT, direction: 'spend' },
          { kind: 'text', text: ` (${BOOST_DURATION_HOURS}h Boost active)` },
        ];
      }
      case 'renamePet': {
        const petId = Number(decoded.data.petId);
        const newName = typeof decoded.data.newName === 'string' ? decoded.data.newName : null;
        if (!newName) return null;
        return [
          { kind: 'address', address: actorAddress },
          { kind: 'text', text: ' renamed ' },
          { kind: 'pet', label: petLabel(petId, pets) },
          { kind: 'text', text: ` to "${newName}"` },
        ];
      }
      case 'depositVault': {
        const treatAmount = rawToTreatAmount(decoded.data.amount, decimals);
        return [
          { kind: 'address', address: actorAddress },
          { kind: 'text', text: ' injected ' },
          { kind: 'treat', amount: treatAmount, direction: 'gain' },
          { kind: 'text', text: ' into the Treat Vault' },
        ];
      }
      case 'withdrawVault': {
        const treatAmount = rawToTreatAmount(decoded.data.amount, decimals);
        return [
          { kind: 'address', address: actorAddress },
          { kind: 'text', text: ' withdrew ' },
          { kind: 'treat', amount: treatAmount, direction: 'spend' },
          { kind: 'text', text: ' from the Treat Vault' },
        ];
      }
      case 'initializeGame':
        return [{ kind: 'address', address: actorAddress }, { kind: 'text', text: ' launched the Genesis Pets!' }];
      case 'updateGameConfig':
        return [{ kind: 'address', address: actorAddress }, { kind: 'text', text: ' tuned the game economy settings' }];
      default:
        return null;
    }
  } catch (err) {
    // Deep-parsing is a nice-to-have, never a requirement �?an
    // older/corrupted/unrecognized transaction just falls back to the
    // basic action label rather than breaking the whole drawer.
    console.warn('[activity] failed to build rich detail for a row, falling back to the plain label', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

/**
 * Kept small on purpose: every open of the Island Log drawer fires one
 * `getSignaturesForAddress` call plus up to `limit` individual
 * `getParsedTransaction` requests (see below) �?even on a dedicated Helius
 * RPC, there's no reason to pull more than a screenful of rows.
 */
const DEFAULT_ACTIVITY_LIMIT = 10;

/**
 * How many `getParsedTransaction` requests are allowed in flight at once.
 * Kept small and polite rather than firing all `limit` requests at the same
 * instant.
 */
const PARSED_TX_CONCURRENCY = 5;

/**
 * Fetches each transaction individually via `getParsedTransaction` �?NOT
 * the batched `getParsedTransactions` �?run with a small concurrency limit.
 *
 * Why: Helius's free tier (and several other RPC providers) rejects
 * JSON-RPC *batch* requests outright with a 403
 * `"Batch requests are only available for paid plans"`. `getParsedTransactions`
 * always sends one batched HTTP call under the hood, so on those plans it
 * failed for every signature at once �?every row silently fell back to
 * "Other" with no error ever surfacing. Individual `getParsedTransaction`
 * calls are plain (non-batched) HTTP requests, so they work on every plan;
 * running a handful concurrently keeps the drawer fast without ever
 * batching.
 */
async function fetchParsedTransactionsWithLimit(
  connection: Connection,
  signatures: string[],
): Promise<(ParsedTransactionWithMeta | null)[]> {
  const results: (ParsedTransactionWithMeta | null)[] = new Array(signatures.length).fill(null);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < signatures.length) {
      const index = nextIndex++;
      try {
        results[index] = await connection.getParsedTransaction(signatures[index], {
          maxSupportedTransactionVersion: 0,
        });
      } catch (err) {
        // A single throttled/failed transaction shouldn't blank out the
        // whole drawer �?it just falls back to "Other Activity" (still
        // showing its real timestamp + explorer link) for this one row.
        console.warn('[activity] a transaction failed to load, showing partial results', err);
      }
    }
  }

  const workerCount = Math.min(PARSED_TX_CONCURRENCY, signatures.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

export interface FetchRecentActivityOptions {
  /** How many signatures to pull. Defaults to `DEFAULT_ACTIVITY_LIMIT` (10). */
  limit?: number;
  /**
   * $TREAT mint decimals, used to scale raw on-chain u64 amounts (claims,
   * deposits, withdrawals) into whole-token amounts for the narrative.
   * Defaults to `DEFAULT_TREAT_DECIMALS` if the caller hasn't loaded the
   * real value yet (see `useMintDecimals`).
   */
  decimals?: number;
  /**
   * Current on-chain pet state (from `usePets()`), used so a narrative row
   * shows a pet's *live* custom name (e.g. "Shiba King") instead of the
   * static petdex creature name. Pass `null`/omit while pets haven't loaded
   * yet — every row just falls back to the static creature name.
   */
  pets?: PetView[] | null;
}

/**
 * Lazy-load-on-open activity feed for the Island Log drawer: one call to
 * list the last `limit` signatures touching the program, then a
 * concurrency-limited batch of individual `getParsedTransaction` requests to
 * pull each transaction's logs + decoded instruction args for a rich
 * narrative. Only ever runs when the drawer is opened or its manual refresh
 * is pressed �?never on a timer.
 */
export async function fetchRecentActivity(
  connection: Connection,
  { limit = DEFAULT_ACTIVITY_LIMIT, decimals = DEFAULT_TREAT_DECIMALS, pets = null }: FetchRecentActivityOptions = {},
): Promise<ActivityEntry[]> {
  const signatureInfos = await connection.getSignaturesForAddress(PROGRAM_PUBKEY, { limit });
  if (signatureInfos.length === 0) return [];

  const signatures = signatureInfos.map((info) => info.signature);
  const transactions = await fetchParsedTransactionsWithLimit(connection, signatures);

  return signatureInfos.map((info, index) => {
    const tx = transactions[index];
    const { label, icon, color } = classifyAction(tx?.meta?.logMessages);
    const detail = tx ? buildActivityDetail(tx, decimals, pets) : null;
    return {
      signature: info.signature,
      actionLabel: label,
      icon,
      color,
      blockTime: info.blockTime ?? tx?.blockTime ?? null,
      success: info.err === null,
      detail,
    };
  });
}
