import type { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import type { LucideIcon } from 'lucide-react';
import { Bone, Coins, Crown, HelpCircle, Sparkles } from 'lucide-react';
import { PROGRAM_PUBKEY } from './pda';

export interface ActivityEntry {
  signature: string;
  actionLabel: string;
  icon: LucideIcon;
  /** Unix seconds, or null if the RPC hadn't attached a block time yet. */
  blockTime: number | null;
  success: boolean;
}

// Anchor's generated instruction dispatcher always logs
// "Program log: Instruction: <PascalCaseName>" as the first line of a
// successful call — classify purely off that, no bespoke on-chain msg!()
// parsing required (works for every instruction, not just the ones that
// happen to log extra details).
const ACTION_BY_LOG_MARKER: { marker: string; label: string; icon: LucideIcon }[] = [
  { marker: 'Instruction: BuyPet', label: 'Snatch / Buyout', icon: Crown },
  { marker: 'Instruction: ClaimCoins', label: 'Claim', icon: Coins },
  { marker: 'Instruction: FeedPet', label: 'Feed', icon: Bone },
  { marker: 'Instruction: RenamePet', label: 'Rename', icon: Sparkles },
];

function classifyAction(logs: string[] | null | undefined): { label: string; icon: LucideIcon } {
  const lines = logs ?? [];
  for (const { marker, label, icon } of ACTION_BY_LOG_MARKER) {
    if (lines.some((line) => line.includes(marker))) return { label, icon };
  }
  return { label: 'Other', icon: HelpCircle };
}

/**
 * Kept small on purpose: every open of the Island Log drawer fires one
 * `getSignaturesForAddress` call plus a handful of `getParsedTransactions`
 * batches (see `PARSED_TX_CHUNK_SIZE`) — even on a dedicated Helius RPC,
 * there's no reason to pull more than a screenful of rows.
 */
const DEFAULT_ACTIVITY_LIMIT = 10;

/**
 * `getParsedTransactions` is fetched in small chunks (rather than one call
 * for all `limit` signatures at once) so a single throttled/failed chunk
 * only degrades those few rows — to signature-only info, still enough for a
 * timestamp + explorer link — instead of throwing and blanking out the
 * entire drawer.
 */
const PARSED_TX_CHUNK_SIZE = 5;

async function fetchParsedTransactionsChunked(
  connection: Connection,
  signatures: string[],
): Promise<(ParsedTransactionWithMeta | null)[]> {
  const results: (ParsedTransactionWithMeta | null)[] = new Array(signatures.length).fill(null);

  const chunkStarts: number[] = [];
  for (let start = 0; start < signatures.length; start += PARSED_TX_CHUNK_SIZE) {
    chunkStarts.push(start);
  }

  // Chunks are fetched concurrently (there are only ever 1-2 of them at the
  // default limit of 10), each wrapped in its own try/catch so one
  // rate-limited chunk can't take the others down with it.
  await Promise.all(
    chunkStarts.map(async (start) => {
      const chunk = signatures.slice(start, start + PARSED_TX_CHUNK_SIZE);
      try {
        const parsed = await connection.getParsedTransactions(chunk, {
          maxSupportedTransactionVersion: 0,
        });
        parsed.forEach((tx, i) => {
          results[start + i] = tx;
        });
      } catch (err) {
        // Best-effort: log for debugging, but let the caller fall back to
        // signature-only info for just this chunk's rows (classified as
        // "Other" below, still showing a timestamp + explorer link) rather
        // than throwing and blanking the whole drawer.
        console.warn('[activity] a transaction chunk failed to load, showing partial results', err);
      }
    }),
  );

  return results;
}

/**
 * Lazy-load-on-open activity feed for the Island Log drawer: one call to
 * list the last `limit` signatures touching the program, then a few small
 * `getParsedTransactions` batches to pull each transaction's logs for
 * classification. Only ever runs when the drawer is opened or its manual
 * refresh is pressed — never on a timer.
 */
export async function fetchRecentActivity(
  connection: Connection,
  limit = DEFAULT_ACTIVITY_LIMIT,
): Promise<ActivityEntry[]> {
  const signatureInfos = await connection.getSignaturesForAddress(PROGRAM_PUBKEY, { limit });
  if (signatureInfos.length === 0) return [];

  const signatures = signatureInfos.map((info) => info.signature);
  const transactions = await fetchParsedTransactionsChunked(connection, signatures);

  return signatureInfos.map((info, index) => {
    const tx = transactions[index];
    const { label, icon } = classifyAction(tx?.meta?.logMessages);
    return {
      signature: info.signature,
      actionLabel: label,
      icon,
      blockTime: info.blockTime ?? tx?.blockTime ?? null,
      success: info.err === null,
    };
  });
}
