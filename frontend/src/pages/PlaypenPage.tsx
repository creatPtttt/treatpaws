import { Button, Card, Skeleton, Tabs } from 'animal-island-ui';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../anchor/useProgram';
import * as ix from '../anchor/instructions';
import type { PetView } from '../anchor/types';
import { useGameConfig } from '../hooks/useGameConfig';
import { usePets } from '../hooks/usePets';
import { useTransactionRunner } from '../hooks/useTransactionRunner';
import { PetCard } from '../components/playpen/PetCard';
import { HallOfFame } from '../components/playpen/HallOfFame';
import { NotInitializedNotice } from '../components/playpen/NotInitializedNotice';

const SKELETON_SLOTS = Array.from({ length: 10 }, (_, index) => index);

/** The live game hall ("/playpen") — on-chain pet grid + Hall of Fame leaderboard. */
export function PlaypenPage() {
  const program = useProgram();
  const { publicKey } = useWallet();
  const {
    gameConfig,
    notInitialized: configMissing,
    loading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = useGameConfig(program);
  const {
    pets,
    notInitialized: petsMissing,
    loading: petsLoading,
    error: petsError,
    refetch: refetchPets,
  } = usePets(program);
  const { pendingKey, run } = useTransactionRunner();

  const refetchAll = () => {
    refetchConfig();
    refetchPets();
  };

  const handleBuy = (pet: PetView) => {
    if (!program || !publicKey || !gameConfig) return;
    run({
      key: `buy-${pet.id}`,
      label: `Snatch Pet #${pet.id}`,
      action: () =>
        ix.buyPet(program, publicKey, pet.id, new PublicKey(gameConfig.admin), new PublicKey(pet.owner)),
      onSuccess: refetchAll,
    });
  };

  const handleClaim = (pet: PetView) => {
    if (!program || !publicKey) return;
    run({
      key: `claim-${pet.id}`,
      label: `Claim rewards for Pet #${pet.id}`,
      action: () => ix.claimCoins(program, publicKey, pet.id),
      onSuccess: refetchAll,
    });
  };

  const handleFeed = (pet: PetView) => {
    if (!program || !publicKey) return;
    run({
      key: `feed-${pet.id}`,
      label: `Feed Pet #${pet.id}`,
      action: () => ix.feedPet(program, publicKey, pet.id),
      onSuccess: refetchAll,
    });
  };

  const handleRename = (pet: PetView, newName: string) => {
    if (!program || !publicKey) return;
    run({
      key: `rename-${pet.id}`,
      label: `Rename Pet #${pet.id}`,
      action: () => ix.renamePet(program, publicKey, pet.id, newName),
      onSuccess: refetchAll,
    });
  };

  const isLoading = configLoading || petsLoading;
  const errorMessage = configError ?? petsError;
  const notInitialized = configMissing || petsMissing;

  return (
    <section className="section playpen-page" aria-label="Live Pet Playpen">
      <div className="playpen-page__heading">
        <h1 className="playpen-page__title">Live Pet Playpen</h1>
        <p className="playpen-page__subtitle">Watch your genesis pets bake $TREAT in real time.</p>
      </div>

      {isLoading && (
        <div className="playpen-page__skeleton-grid">
          {SKELETON_SLOTS.map((slot) => (
            <Skeleton key={slot} variant="rect" widthValue="100%" heightValue={240} />
          ))}
        </div>
      )}

      {!isLoading && errorMessage && (
        <Card className="playpen-page__notice">
          <p>Couldn't load on-chain data: {errorMessage}</p>
          <Button onClick={refetchAll}>Retry</Button>
        </Card>
      )}

      {!isLoading && !errorMessage && notInitialized && <NotInitializedNotice />}

      {!isLoading && !errorMessage && !notInitialized && gameConfig && pets && (
        <Tabs
          items={[
            {
              key: 'playpen',
              label: 'Playpen',
              children: (
                <div className="pet-grid">
                  {pets.map((pet) => (
                    <PetCard
                      key={pet.id}
                      pet={pet}
                      gameConfig={gameConfig}
                      currentUser={publicKey}
                      pendingKey={pendingKey}
                      onBuy={handleBuy}
                      onClaim={handleClaim}
                      onFeed={handleFeed}
                      onRename={handleRename}
                    />
                  ))}
                </div>
              ),
            },
            {
              key: 'hall-of-fame',
              label: 'Hall of Fame',
              children: <HallOfFame pets={pets} currentUser={publicKey} />,
            },
          ]}
        />
      )}
    </section>
  );
}
