import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'treatpaws-companion-enabled';

function readStoredEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return true;
    return raw !== '0' && raw !== 'false';
  } catch {
    return true;
  }
}

interface CompanionGateValue {
  /** Playground (or similar) forces the follower off regardless of the whistle. */
  suppressFollower: boolean;
  setSuppressFollower: (value: boolean) => void;
  /** User whistle toggle — default active; false = resting in sanctuary. */
  followerEnabled: boolean;
  setFollowerEnabled: (value: boolean) => void;
  /** True when the connected wallet owns ≥1 pet (drives the header whistle). */
  companionAvailable: boolean;
  setCompanionAvailable: (value: boolean) => void;
}

const CompanionGateContext = createContext<CompanionGateValue | null>(null);

/** App-wide gate for the cursor companion + header whistle toggle. */
export function CompanionGateProvider({ children }: { children: ReactNode }) {
  const [suppressFollower, setSuppressFollower] = useState(false);
  const [followerEnabled, setFollowerEnabledState] = useState(readStoredEnabled);
  const [companionAvailable, setCompanionAvailable] = useState(false);

  const setFollowerEnabled = useCallback((value: boolean) => {
    setFollowerEnabledState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* ignore quota / private-mode failures */
    }
  }, []);

  const value = useMemo(
    () => ({
      suppressFollower,
      setSuppressFollower,
      followerEnabled,
      setFollowerEnabled,
      companionAvailable,
      setCompanionAvailable,
    }),
    [suppressFollower, followerEnabled, setFollowerEnabled, companionAvailable],
  );

  return <CompanionGateContext.Provider value={value}>{children}</CompanionGateContext.Provider>;
}

export function useCompanionGate(): CompanionGateValue {
  const ctx = useContext(CompanionGateContext);
  if (!ctx) {
    throw new Error('useCompanionGate must be used inside CompanionGateProvider');
  }
  return ctx;
}
