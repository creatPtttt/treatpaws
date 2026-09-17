/** Shortens a base58 wallet address to `abcd…wxyz` for compact UI display. */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Formats a SOL amount with up to 3 decimal places, no trailing zeros. */
export function formatSol(amount: number | null): string {
  if (amount === null) return '—';
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`;
}
