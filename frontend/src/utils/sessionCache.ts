/** Landing-page on-chain reads share this TTL so reloads do not spam RPC. */
export const LANDING_CACHE_TTL_MS = 2 * 60 * 1000;

interface CacheEnvelope<T> {
  savedAt: number;
  data: T;
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

/**
 * Returns cached `data` when the entry exists and is still inside `ttlMs`.
 * Expired or corrupt entries are removed. Never throws (private mode / quota).
 */
export function readSessionCache<T>(key: string, ttlMs: number = LANDING_CACHE_TTL_MS): T | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== 'number') {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (Date.now() - parsed.savedAt > ttlMs) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

/** Writes `data` with a fresh timestamp. Silently no-ops if storage is unavailable. */
export function writeSessionCache<T>(key: string, data: T): void {
  if (!canUseSessionStorage()) return;
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
    window.sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or blocked storage — skip caching rather than crash the page.
  }
}
