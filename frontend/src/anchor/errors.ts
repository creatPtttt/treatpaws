import idl from '../idl/pet_game.json';

// Build a { code -> human message } lookup once from the IDL's error table
// (Unauthorized, InsufficientPayment, NameTooLong, etc.) so on-chain
// `custom program error: 0x17xx` codes can be shown as real sentences.
const ERROR_MESSAGES_BY_CODE: Record<number, string> = Object.fromEntries(
  idl.errors.map((entry) => [entry.code, entry.msg]),
);

/** Best-effort extraction of a readable message from any thrown value. */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;

    // Wallet-adapter surfaces user cancellations with this name/message.
    if (message.toLowerCase().includes('user rejected')) {
      return 'You rejected the request in your wallet.';
    }

    // Anchor program errors look like "... custom program error: 0x1772 ..."
    // or embed the numeric code elsewhere in the string — try to match it
    // against our IDL error table for a friendlier message.
    const hexMatch = message.match(/0x([0-9a-fA-F]+)/);
    if (hexMatch) {
      const code = parseInt(hexMatch[1], 16);
      const known = ERROR_MESSAGES_BY_CODE[code];
      if (known) return known;
    }

    return message;
  }

  return 'Something went wrong. Please try again.';
}
