import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Drawer, Skeleton } from 'animal-island-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { Coffee, RefreshCw, XCircle } from 'lucide-react';
import { fetchRecentActivity, type ActivityEntry, type ActivityHighlightPart } from '../../anchor/activity';
import { explorerUrl } from '../../data/chain';
import { extractErrorMessage } from '../../anchor/errors';
import { shortenAddress } from '../../wallet/format';
import { formatRelativeTime } from '../../utils/time';
import { useMintDecimals } from '../../hooks/useMintDecimals';
import type { PetView } from '../../anchor/types';

interface ActivityDrawerProps {
  open: boolean;
  onClose: () => void;
  /**
   * Current on-chain pet state (from `usePets()` in `PlaypenPage`), passed
   * down so narrative rows show a pet's *live* custom name (e.g. "Shiba
   * King") instead of the static petdex creature name. `null` while pets
   * haven't loaded yet — rows just fall back to the static creature name.
   */
  pets: PetView[] | null;
}

/** Whole-number-friendly $TREAT amount formatting (`456,800` / `12.5`). */
function formatTreatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toLocaleString('en-US', { maximumFractionDigits: rounded % 1 === 0 ? 0 : 2 });
}

/**
 * Renders one piece of a rich activity narrative (see `ActivityHighlightPart`
 * in `anchor/activity.ts`) with its own cozy inline style: shortened
 * monospace address badges, bold caramel pet names, and green/gold SOL &
 * $TREAT pills.
 */
function ActivityNarrativePart({ part }: { part: ActivityHighlightPart }) {
  switch (part.kind) {
    case 'text':
      return <>{part.text}</>;
    case 'address':
      return (
        <span className="activity-drawer__addr" title={part.address}>
          {shortenAddress(part.address)}
        </span>
      );
    case 'pet':
      return <span className="activity-drawer__pet">{part.label}</span>;
    case 'sol':
      return (
        <span className={`activity-drawer__amount activity-drawer__amount--sol activity-drawer__amount--${part.direction}`}>
          {part.direction === 'gain' ? '+' : '−'}
          {part.amount.toFixed(4)} SOL
        </span>
      );
    case 'treat':
      return (
        <span className={`activity-drawer__amount activity-drawer__amount--treat activity-drawer__amount--${part.direction}`}>
          {part.direction === 'gain' ? '+' : '−'}
          {formatTreatAmount(part.amount)} $TREAT
        </span>
      );
    default:
      return null;
  }
}

/**
 * "Island Log" — the last 10 on-chain actions touching the program,
 * rendered as a narrative newsfeed (who did what, to which pet, for how
 * much) rather than a bare action label. Pet names in that narrative prefer
 * each pet's live on-chain `name` (from the `pets` prop) over the static
 * petdex creature name, so a rename like "Shiba King" shows up correctly
 * instead of always saying "Shiba". Lazy-loaded: nothing is fetched until
 * the drawer is actually opened, and this component stays mounted (see
 * `PlaypenPage`, which only toggles its `open` prop) so `entries` is cached
 * in state across opens/closes — once loaded, reopening the drawer never
 * refetches. Only the manual "Refresh" button below triggers a new network
 * call.
 */
export function ActivityDrawer({ open, onClose, pets }: ActivityDrawerProps) {
  const { connection } = useConnection();
  const { decimals } = useMintDecimals(connection);
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedOnceRef = useRef(false);
  // Read via a ref inside `load()` rather than adding `pets` to its
  // dependency array — `pets` changes every ~15s poll tick in
  // `PlaypenPage`, and we don't want that to redefine `load` (which would
  // otherwise be indistinguishable from "click Refresh" to any effect
  // depending on it). `load()` always reads whichever pets are freshest at
  // the moment it actually runs.
  const petsRef = useRef(pets);
  petsRef.current = pets;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRecentActivity(connection, { decimals, pets: petsRef.current });
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
  }, [connection, decimals]);

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
                  <span
                    className="activity-drawer__icon"
                    style={{ color: entry.success ? entry.color : '#dc2626' }}
                    aria-hidden="true"
                  >
                    {entry.success ? <Icon size={18} /> : <XCircle size={18} />}
                  </span>
                  <span className="activity-drawer__body">
                    <span className="activity-drawer__action">
                      {entry.success ? entry.actionLabel : `${entry.actionLabel} (failed)`}
                    </span>
                    {/* Rich "who / which pet / how much" sentence — only
                        rendered when deep parsing succeeded (see `detail`'s
                        doc comment in activity.ts); otherwise the plain
                        action label above already covers it. */}
                    {entry.detail && (
                      <span className="activity-drawer__narrative">
                        {entry.detail.map((part, index) => (
                          // eslint-disable-next-line react/no-array-index-key -- parts are a fixed, ordered sentence, never reordered/filtered.
                          <ActivityNarrativePart key={index} part={part} />
                        ))}
                      </span>
                    )}
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
