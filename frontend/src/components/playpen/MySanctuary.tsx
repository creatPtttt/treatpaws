import { Button, Card } from 'animal-island-ui';
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js';
import { Coins, PawPrint, Wallet } from 'lucide-react';
import type { GameConfigView, PetView } from '../../anchor/types';
import { useAggregateRewards } from '../../hooks/useAggregateRewards';
import { PetCard } from './PetCard';

interface MySanctuaryProps {
  pets: PetView[];
  gameConfig: GameConfigView;
  currentUser: PublicKey | null;
  pendingKey: string | null;
  onBuy: (pet: PetView) => void;
  onClaim: (pet: PetView) => void;
  onFeed: (pet: PetView) => void;
  onRename: (pet: PetView, newName: string) => void;
  onHarvestAll: () => void;
  onGoToAllPets: () => void;
}

const HARVEST_ALL_KEY = 'harvest-all';

/**
 * "My Sanctuary" — the personal hub tab: only the pets the connected
 * wallet owns, a trainer stats bar, and a one-click "Harvest All Treats"
 * that batches every owned pet's claim into a single signed transaction.
 */
export function MySanctuary({
  pets,
  gameConfig,
  currentUser,
  pendingKey,
  onBuy,
  onClaim,
  onFeed,
  onRename,
  onHarvestAll,
  onGoToAllPets,
}: MySanctuaryProps) {
  const ownedPets = currentUser ? pets.filter((pet) => pet.owner === currentUser.toBase58()) : [];
  const totalUnclaimed = useAggregateRewards(ownedPets, gameConfig);
  const totalValuationSol =
    ownedPets.reduce((sum, pet) => sum + pet.currentPriceLamports, 0) / LAMPORTS_PER_SOL;

  const harvestBusy = pendingKey === HARVEST_ALL_KEY;

  if (ownedPets.length === 0) {
    return (
      <Card type="dashed" className="sanctuary-empty">
        <PawPrint size={40} className="sanctuary-empty__icon" aria-hidden="true" />
        <p className="sanctuary-empty__title">You don't own any pets yet!</p>
        <p className="sanctuary-empty__subtitle">Snatch one from the playpen to start your own sanctuary.</p>
        <Button type="primary" onClick={onGoToAllPets}>
          Browse All Pets
        </Button>
      </Card>
    );
  }

  return (
    <div className="sanctuary">
      <div className="sanctuary-stats">
        <Card color="app-yellow" className="sanctuary-stats__card">
          <PawPrint size={26} className="sanctuary-stats__icon" aria-hidden="true" />
          <p className="sanctuary-stats__value">{ownedPets.length}</p>
          <p className="sanctuary-stats__label">Pets Owned</p>
        </Card>
        <Card color="app-teal" className="sanctuary-stats__card">
          <Coins size={26} className="sanctuary-stats__icon" aria-hidden="true" />
          <p className="sanctuary-stats__value">{totalUnclaimed.toFixed(2)}</p>
          <p className="sanctuary-stats__label">Unclaimed $TREAT</p>
        </Card>
        <Card color="app-orange" className="sanctuary-stats__card">
          <Wallet size={26} className="sanctuary-stats__icon" aria-hidden="true" />
          <p className="sanctuary-stats__value">{totalValuationSol.toFixed(4)}</p>
          <p className="sanctuary-stats__label">Portfolio Value (SOL)</p>
        </Card>
      </div>

      <Button
        type="primary"
        size="large"
        block
        className="sanctuary__harvest-button"
        loading={harvestBusy}
        disabled={pendingKey !== null || totalUnclaimed <= 0}
        onClick={onHarvestAll}
      >
        Harvest All Treats {totalUnclaimed > 0 ? `(+${totalUnclaimed.toFixed(2)})` : ''}
      </Button>

      <div className="pet-grid">
        {ownedPets.map((pet) => (
          <PetCard
            key={pet.id}
            pet={pet}
            gameConfig={gameConfig}
            currentUser={currentUser}
            pendingKey={pendingKey}
            forceBusy={harvestBusy}
            onBuy={onBuy}
            onClaim={onClaim}
            onFeed={onFeed}
            onRename={onRename}
          />
        ))}
      </div>
    </div>
  );
}
