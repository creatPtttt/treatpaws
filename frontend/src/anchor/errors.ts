import idl from '../idl/pet_game.json';

// Build a { code -> human message } lookup once from the IDL's error table
// (Unauthorized, InsufficientPayment, NameTooLong, etc.) so on-chain
// `custom program error: 0x17xx` codes can be shown as real sentences.
const ERROR_MESSAGES_BY_CODE: Record<number, string> = Object.fromEntries(
  idl.errors.map((entry) => [entry.code, entry.msg]),
);

function rawMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong. Please try again.';
}

/** Anchor program errors look like "... custom program error: 0x1772 ..." — pull the numeric code out, if present. */
function extractProgramErrorCode(message: string): number | null {
  const hexMatch = message.match(/0x([0-9a-fA-F]+)/);
  if (!hexMatch) return null;
  return parseInt(hexMatch[1], 16);
}

// Phantom (and the wallet-adapter wrapping it) surfaces a user cancelling
// the approval popup a few different ways depending on the wallet and
// whether the rejection happened on `signTransaction` vs `sendTransaction`.
function isUserRejection(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('user rejected') ||
    lower.includes('user declined') ||
    lower.includes('rejected the request') ||
    // Phantom/EIP-1193-style rejection code, sometimes the only signal
    // present in the error (e.g. "4001: User Rejected").
    lower.includes('4001')
  );
}

// `InsufficientPayment` (our own program, thrown when the buyer's attached
// lamports don't match the pet's current price) plus the plain wallet-level
// "not enough SOL to cover this transfer + fee" failures that never even
// reach our program.
function isInsufficientSol(message: string, code: number | null): boolean {
  if (code === 6002 /* InsufficientPayment */) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes('insufficient lamports') ||
    (lower.includes('insufficient') && lower.includes('fund')) ||
    lower.includes('attempt to debit an account but found no record of a prior credit')
  );
}

// `InsufficientVaultBalance` (6005, vault ran dry) and
// `InsufficientTokenBalance` (6006, the player's own $TREAT ATA is short) —
// both ultimately mean "not enough $TREAT was available for this action".
function isInsufficientTreat(message: string, code: number | null): boolean {
  if (code === 6005 || code === 6006) return true;
  const lower = message.toLowerCase();
  return lower.includes('insufficient') && lower.includes('$game');
}

/**
 * Best-effort extraction of a readable message from any thrown value. Used
 * by read-only hooks (`usePets`, `useGameConfig`, `ActivityDrawer`) that
 * just need a plain string for an inline "couldn't load X" notice — for
 * user-initiated transactions, prefer `classifyTransactionError` below,
 * which additionally picks the right toast tone (info/warning/error) and
 * fully replaces raw wallet-rejection/on-chain text with cozy copy.
 */
export function extractErrorMessage(error: unknown): string {
  const message = rawMessageOf(error);

  if (isUserRejection(message)) {
    return 'You rejected the request in your wallet.';
  }

  const code = extractProgramErrorCode(message);
  if (code !== null) {
    const known = ERROR_MESSAGES_BY_CODE[code];
    if (known) return known;
  }

  return message;
}

export type FriendlyNotificationType = 'info' | 'warning' | 'error';

export interface FriendlyError {
  /** Which toast tone to use — a cancellation is informational, not an error. */
  type: FriendlyNotificationType;
  message: string;
}

// A raw RPC/simulation failure can be a multi-hundred-character JSON dump
// (account keys, program logs, base64 data...) — anything that long, or
// containing object/array brackets, is almost certainly not meant for a
// player to read.
function looksLikeRawDump(message: string): boolean {
  return message.length > 140 || /[{}[\]]/.test(message);
}

/**
 * Translates a raw thrown error — a Phantom cancellation, an on-chain
 * Anchor error, a wallet-level "not enough SOL" failure, or an
 * unrecognized RPC dump — into a cozy, player-facing toast: a `type`
 * (`info` for cancellations, `warning` for "you need more X", `error` for
 * everything else) plus a short friendly `message`, never raw JSON.
 *
 * `actionKey` is the same per-action key `useTransactionRunner` already
 * tracks (e.g. `feed-3`, `buy-7`) — used only to pick the "adopt" vs "feed"
 * phrasing when the underlying failure is generically "insufficient
 * balance" either way.
 */
export function classifyTransactionError(error: unknown, actionKey?: string): FriendlyError {
  const rawMessage = rawMessageOf(error);

  if (isUserRejection(rawMessage)) {
    return { type: 'info', message: 'Transaction canceled — your pets are still waiting! 🐾' };
  }

  const code = extractProgramErrorCode(rawMessage);

  if (isInsufficientSol(rawMessage, code)) {
    return { type: 'warning', message: 'Oops! You need a bit more SOL in your wallet to adopt.' };
  }

  if (isInsufficientTreat(rawMessage, code)) {
    const isFeedAction = actionKey?.startsWith('feed-') ?? false;
    return {
      type: 'warning',
      message: isFeedAction
        ? 'Not enough $TREAT snacks! You need 500 $TREAT to boost.'
        : "Not enough $TREAT in your wallet just yet — harvest a bit more first!",
    };
  }

  // A recognized on-chain error (from the IDL's own error table) is
  // already a real, short English sentence — safe to show as-is.
  if (code !== null && ERROR_MESSAGES_BY_CODE[code]) {
    return { type: 'error', message: ERROR_MESSAGES_BY_CODE[code] };
  }

  return {
    type: 'error',
    message: looksLikeRawDump(rawMessage)
      ? "That didn't go through — please try again in a moment."
      : rawMessage,
  };
}
