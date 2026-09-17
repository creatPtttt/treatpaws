/**
 * TreatPaws' canonical viral share copy for X (Twitter) — used both from the
 * buyout celebration modal and from an owned pet's action area, so every
 * share looks the same and stays on-brand no matter where it was triggered.
 */
const SHARE_TWEET_TEXT = [
  '🐾 Just cashed out passive profits on @TreatPaws!',
  'Trick or treat? Adopt, feed, and harvest $TREAT on Solana!',
  'Play now: https://treatpaws.vercel.app #TreatPaws #Solana $TREAT',
].join('\n');

/** Opens X's (Twitter) tweet-composer intent in a new tab, pre-filled with TreatPaws' share copy. */
export function shareToX(): void {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TWEET_TEXT)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
