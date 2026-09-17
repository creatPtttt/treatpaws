import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Drawer, Skeleton } from 'animal-island-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { Coffee, RefreshCw, XCircle } from 'lucide-react';
import { fetchRecentActivity, type ActivityEntry } from '../../anchor/activity';
import { explorerUrl } from '../../data/chain';
import { extractErrorMessage } from '../../anchor/errors';
import { shortenAddress } from '../../wallet/format';
import { formatRelativeTime } from '../../utils/time';

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Island Log" — the last 15 on-chain actions touching the program.
 * Lazy-loaded: nothing is fetched until the drawer is actually opened (or
 * its manual refresh button is pressed), never on a background timer.
 */
export function ActivityDrawer({ open, onClose }: ActivityDrawerProps) {
  const { connection } = useConnection();
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnceRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRecentActivity(connection);
      setEntries(result);
    } catch (err) {
      // Keep the real message in the console for debugging, but never show
      // raw RPC/JSON error strings (e.g. "429: Too many requests") in the UI
      // — a cozy, generic message below covers every failure case.
      console.warn('[activity-drawer] failed to load activity', extractErrorMessage(err));
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    if (open && !hasFetchedOnceRef.current) {
      hasFetchedOnceRef.current = true;
      void load();
    }
  }, [open, load]);

  return (
    <Drawer
      open={open}
      title="Island Log"
      placement="right"
      width={380}
      onClose={onClose}
      footer={
        <Button block onClick={load} loading={loading} icon={<RefreshCw size={16} />}>
          Refresh
        </Button>
      }
    >
      <div className="activity-drawer">
        {loading && !entries && <Skeleton variant="paragraph" rows={6} />}

        {!loading && error && !entries && (
          <div className="activity-drawer__error">
            <Coffee size={28} className="activity-drawer__error-icon" aria-hidden="true" />
            <p>Island records are resting, try again in a moment!</p>
          </div>
        )}

        {entries && entries.length === 0 && (
          <p className="activity-drawer__empty">No on-chain activity yet — be the first to make a move!</p>
        )}

        {entries && entries.length > 0 && (
          <ul className="activity-drawer__list">
            {entries.map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.signature} className="activity-drawer__item">
                  <span className="activity-drawer__icon" aria-hidden="true">
                    {entry.success ? <Icon size={18} /> : <XCircle size={18} />}
                  </span>
                  <span className="activity-drawer__body">
                    <span className="activity-drawer__action">
                      {entry.success ? entry.actionLabel : `${entry.actionLabel} (failed)`}
                    </span>
                    <a
                      href={explorerUrl(entry.signature, 'tx')}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="activity-drawer__signature"
                    >
                      {shortenAddress(entry.signature, 6)}
                    </a>
                  </span>
                  <span className="activity-drawer__time">{formatRelativeTime(entry.blockTime)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
