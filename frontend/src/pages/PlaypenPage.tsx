import { useCallback, useState } from 'react';
import { Button, Card, Skeleton, Tabs } from 'animal-island-ui';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { ScrollText } from 'lucide-react';
import { useProgram } from '../anchor/useProgram';
import * as ix from '../anchor/instructions';
import type { PetView } from '../anchor/types';
import type { TakeoverDetails } from '../utils/takeover';
import { useGameConfig } from '../hooks/useGameConfig';
import { usePets } from '../hooks/usePets';
import { useTransactionRunner } from '../hooks/useTransactionRunner';
import { useProgramEvents } from '../hooks/useProgramEvents';
import { useOfflineTakeoverDetection } from '../hooks/useOfflineTakeoverDetection';
import { PetCard } from '../components/playpen/PetCard';
import { MySanctuary } from '../components/playpen/MySanctuary';
import { HallOfFame } from '../components/playpen/HallOfFame';
import { ActivityDrawer } from '../components/playpen/ActivityDrawer';
import { TakeoverCelebrationModal } from '../components/playpen/TakeoverCelebrationModal';
import { NotInitializedNotice } from '../components/playpen/NotInitializedNotice';

const SKELETON_SLOTS = Array.from({ length: 10 }, (_, index) => index);
const HARVEST_ALL_KEY = 'harvest-all';

/** The live game hall ("/playpen") — on-chain pet grid, My Sanctuary hub, and Hall of Fame leaderboard. */
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
  const [activeTab, setActiveTab] = useState('playpen');
  const [logOpen, setLogOpen] = useState(false);
  // Queue rather than a single slot — if multiple pets were bought out
  // while this tab was closed, each gets its own celebration in turn
  // instead of only the first (or last) one ever being shown.
  const [celebrationQueue, setCelebrationQueue] = useState<TakeoverDetails[]>([]);

  const handleTakeoverDetected = useCallback((details: TakeoverDetails) => {
    setCelebrationQueue((queue) => [...queue, details]);
  }, []);

  // Live path: zero-HTTP-polling WebSocket subscription — escalates to the
  // celebration modal for MY buyouts, soft-toasts everyone else's.
  useProgramEvents(pets, gameConfig, handleTakeoverDetected);
  // Offline path: "welcome back" diff against the last localStorage
  // snapshot of owned pets, fires once per wallet-connect session.
  useOfflineTakeoverDetection(pets, gameConfig, publicKey, handleTakeoverDetected);

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

  const handleHarvestAll = () => {
    if (!program || !publicKey || !pets) return;
    const ownedIds = pets.filter((pet) => pet.owner === publicKey.toBase58()).map((pet) => pet.id);
    if (ownedIds.length === 0) return;
    run({
      key: HARVEST_ALL_KEY,
      label: 'Harvest All Treats',
      action: () => ix.claimAllCoins(program, publicKey, ownedIds),
      onSuccess: refetchAll,
    });
  };

  const errorMessage = configError ?? petsError;
  const notInitialized = configMissing || petsMissing;
  const hasPets = pets !== null && pets.length > 0;
  // Only the very first load (before we have any pets to show at all)
  // should render the full-page skeleton. Once real pet data has arrived
  // once, background polling (`loading`/`isRefetching` flipping true again
  // on later ticks) must never unmount the live cards — that was the
  // source of the "flickers back to grey skeletons" bug.
  const showSkeleton = (configLoading || petsLoading) && !hasPets;
  const showError = !showSkeleton && !hasPets && !!errorMessage;
  const showNotInitialized = !showSkeleton && !hasPets && !errorMessage && notInitialized;
  const showPets = hasPets && gameConfig;
  const ownedCount = pets && publicKey ? pets.filter((pet) => pet.owner === publicKey.toBase58()).length : 0;

  return (
    <section className="section playpen-page" aria-label="Live Pet Playpen">
      <div className="playpen-page__heading">
        <div>
          <h1 className="playpen-page__title">Live Pet Playpen</h1>
          <p className="playpen-page__subtitle">Watch your genesis pets bake $TREAT in real time.</p>
        </div>
        <Button
          icon={<ScrollText size={18} />}
          onClick={() => setLogOpen(true)}
          className="playpen-page__log-button"
        >
          Island Log
        </Button>
      </div>

      {showSkeleton && (
        <div className="playpen-page__skeleton-grid">
          {SKELETON_SLOTS.map((slot) => (
            <Skeleton key={slot} variant="rect" widthValue="100%" heightValue={240} />
          ))}
        </div>
      )}

      {showError && (
        <Card className="playpen-page__notice">
          <p>Couldn't load on-chain data: {errorMessage}</p>
          <Button onClick={refetchAll}>Retry</Button>
        </Card>
      )}

      {showNotInitialized && <NotInitializedNotice />}

      {/* Inline-checking `pets`/`gameConfig` here (rather than the `showPets`
          boolean above) lets TypeScript narrow both to non-null for the JSX
          below — `showPets` on its own can't carry that narrowing through. */}
      {pets && gameConfig && showPets && (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'playpen',
              label: `All Pets (${pets.length})`,
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
              key: 'sanctuary',
              label: `My Sanctuary (${ownedCount})`,
              children: (
                <MySanctuary
                  pets={pets}
                  gameConfig={gameConfig}
                  currentUser={publicKey}
                  pendingKey={pendingKey}
                  onBuy={handleBuy}
                  onClaim={handleClaim}
                  onFeed={handleFeed}
                  onRename={handleRename}
                  onHarvestAll={handleHarvestAll}
                  onGoToAllPets={() => setActiveTab('playpen')}
                />
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

      <ActivityDrawer open={logOpen} onClose={() => setLogOpen(false)} pets={pets} />

      <TakeoverCelebrationModal
        details={celebrationQueue[0] ?? null}
        onClose={() => setCelebrationQueue((queue) => queue.slice(1))}
      />
    </section>
  );
}
