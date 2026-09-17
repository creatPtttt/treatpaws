import { useCallback, useState } from 'react';
import { Notification } from 'animal-island-ui';
import { extractErrorMessage } from '../anchor/errors';
import { shortenAddress } from '../wallet/format';

interface RunOptions {
  /** Unique key for the action in flight, e.g. `claim-3` or `feed-7`. Drives per-button loading state. */
  key: string;
  /** Human label used in the toast, e.g. "Claim rewards". */
  label: string;
  action: () => Promise<string>;
  /** Called after a confirmed success, e.g. to refetch on-chain data. */
  onSuccess?: () => void;
}

/**
 * Wraps an Anchor `.rpc()` call with a per-action loading flag plus success/
 * error toasts (via animal-island-ui's imperative Notification API).
 */
export type RunFn = (options: RunOptions) => Promise<string | null>;

export function useTransactionRunner() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const run = useCallback(async ({ key, label, action, onSuccess }: RunOptions) => {
    setPendingKey(key);
    try {
      const signature = await action();
      Notification.success({
        message: `${label} confirmed`,
        description: shortenAddress(signature, 8),
        duration: 5,
      });
      onSuccess?.();
      return signature;
    } catch (error) {
      Notification.error({
        message: `${label} failed`,
        description: extractErrorMessage(error),
        duration: 7,
      });
      return null;
    } finally {
      setPendingKey(null);
    }
  }, []);

  return { pendingKey, run };
}
