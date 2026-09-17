import { useCallback, useState } from 'react';
import { Notification } from 'animal-island-ui';
import { classifyTransactionError } from '../anchor/errors';
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
 *
 * Failures are never shown as raw wallet/RPC text — `classifyTransactionError`
 * (see anchor/errors.ts) translates them into cozy, player-facing copy and
 * picks the right toast tone: a Phantom cancellation gets a soft `info`
 * toast (the player didn't do anything wrong!), "not enough SOL/$TREAT"
 * gets a `warning`, and everything else gets a short `error` toast instead
 * of a technical dump.
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
      const friendly = classifyTransactionError(error, key);
      // Cancellations aren't failures — no "${label} failed" framing, just
      // the warm standalone message ("Transaction canceled — your pets are
      // still waiting! 🐾"). Everything else keeps the label for context
      // (e.g. "Feed Pet #7 failed") alongside the friendly reason.
      if (friendly.type === 'info') {
        Notification.info({ message: friendly.message, duration: 5 });
      } else if (friendly.type === 'warning') {
        Notification.warning({
          message: `${label} needs a bit more`,
          description: friendly.message,
          duration: 6,
        });
      } else {
        Notification.error({
          message: `${label} failed`,
          description: friendly.message,
          duration: 7,
        });
      }
      return null;
    } finally {
      setPendingKey(null);
    }
  }, []);

  return { pendingKey, run };
}
