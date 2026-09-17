import { useState } from 'react';
import cn from 'classnames';
import { Button, Card, Tag } from 'animal-island-ui';
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js';
import { Flame, Timer } from 'lucide-react';
import type { GameConfigView, PetView } from '../../anchor/types';
import { useLiveRewards } from '../../hooks/useLiveRewards';
import { shortenAddress } from '../../wallet/format';
import { formatDuration } from '../../utils/time';
import { PetSprite } from '../ui/PetSprite';
import { getCreature } from '../../data/creatures';
import { FeedConfirmModal } from './FeedConfirmModal';
import { RenameModal } from './RenameModal';

interface PetCardProps {
  pet: PetView;
  gameConfig: GameConfigView;
  currentUser: PublicKey | null;
  /** Key of whichever action is currently mid-flight, e.g. "claim-3". */
  pendingKey: string | null;
  /** Extra busy flag independent of `pendingKey` — e.g. My Sanctuary's "Harvest All" is claiming this pet as part of a batch. */
  forceBusy?: boolean;
  onBuy: (pet: PetView) => void;
  onClaim: (pet: PetView) => void;
  onFeed: (pet: PetView) => void;
  onRename: (pet: PetView, newName: string) => void;
}

/** One genesis pet's live on-chain state + player actions. */
export function PetCard({
  pet,
  gameConfig,
  currentUser,
  pendingKey,
  forceBusy = false,
  onBuy,
  onClaim,
  onFeed,
  onRename,
}: PetCardProps) {
  const { pending, boosted, boostRemainingSeconds } = useLiveRewards(pet, gameConfig);
  const [feedOpen, setFeedOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const isMine = currentUser !== null && currentUser.toBase58() === pet.owner;
  const priceSol = pet.currentPriceLamports / LAMPORTS_PER_SOL;
  // Disable every button on this card while ANY action for this pet id is
  // in flight, OR while a caller-driven batch action (Harvest All) covers it.
  const cardBusy = (pendingKey?.endsWith(`-${pet.id}`) ?? false) || forceBusy;

  return (
    <Card hoverable className={cn('pet-card', isMine && 'pet-card--mine')}>
      <div className="pet-card__header">
        <span className="pet-card__id">Pet #{pet.id}</span>
        {isMine && (
          <Tag color="app-green" variant="solid" size="small">
            Mine
          </Tag>
        )}
      </div>

      <div className="pet-card__avatar-wrap">
        <PetSprite creature={getCreature(pet.id)} size={72} />
      </div>

      <h3 className="pet-card__name">{pet.name}</h3>
      <p className="pet-card__owner" title={pet.owner}>
        Owner: {shortenAddress(pet.owner)}
      </p>

      <div className="pet-card__reward">
        <span className="pet-card__reward-value">+{pending.toFixed(2)}</span>
        <span className="pet-card__reward-label">$TREAT accrued</span>
      </div>

      <Tag
        color={boosted ? 'app-orange' : 'app-teal'}
        variant="soft"
        size="small"
        className="pet-card__status-tag"
      >
        {boosted ? <Flame size={13} /> : <Timer size={13} />}
        {boosted
          ? `Boosted ${gameConfig.boostRewardRate}/10m · ${formatDuration(boostRemainingSeconds)} left`
          : `Regular ${gameConfig.baseRewardRate}/10m`}
      </Tag>

      <p className="pet-card__price">{priceSol.toFixed(4)} SOL</p>

      {isMine ? (
        <div className="pet-card__actions">
          <Button
            type="primary"
            size="small"
            block
            loading={pendingKey === `claim-${pet.id}`}
            disabled={cardBusy}
            onClick={() => onClaim(pet)}
          >
            Claim Rewards
          </Button>
          <div className="pet-card__actions-row">
            <Button size="small" disabled={cardBusy} onClick={() => setFeedOpen(true)}>
              Feed
            </Button>
            <Button size="small" disabled={cardBusy} onClick={() => setRenameOpen(true)}>
              Rename
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="primary"
          size="small"
          block
          loading={pendingKey === `buy-${pet.id}`}
          disabled={cardBusy}
          onClick={() => onBuy(pet)}
        >
          Snatch for {priceSol.toFixed(4)} SOL
        </Button>
      )}

      <FeedConfirmModal
        open={feedOpen}
        petName={pet.name}
        cost={gameConfig.feedCost}
        loading={pendingKey === `feed-${pet.id}`}
        onClose={() => setFeedOpen(false)}
        onConfirm={() => {
          onFeed(pet);
          setFeedOpen(false);
        }}
      />
      <RenameModal
        open={renameOpen}
        currentName={pet.name}
        cost={gameConfig.renameCost}
        loading={pendingKey === `rename-${pet.id}`}
        onClose={() => setRenameOpen(false)}
        onConfirm={(newName) => {
          onRename(pet, newName);
          setRenameOpen(false);
        }}
      />
    </Card>
  );
}
