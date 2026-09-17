import { Button, Card, Tag } from 'animal-island-ui';
import type { Program } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';
import { initializeGame } from '../../anchor/instructions';
import { DEFAULT_GENESIS_PRICE_LAMPORTS, GENESIS_PET_COUNT } from '../../data/chain';
import type { RunFn } from '../../hooks/useTransactionRunner';

interface InitializeGameCardProps {
  program: Program | null;
  publicKey: PublicKey | null;
  /** true once we've confirmed on-chain that GameConfig doesn't exist yet. */
  notInitialized: boolean;
  /** true while the initial on-chain status check is still in flight. */
  checking: boolean;
  pendingKey: string | null;
  run: RunFn;
  onSuccess: () => void;
}

const ACTION_KEY = 'initialize';

/** Admin card #1: one-time setup that creates GameConfig, Vault, and all 10 Pet PDAs. */
export function InitializeGameCard({
  program,
  publicKey,
  notInitialized,
  checking,
  pendingKey,
  run,
  onSuccess,
}: InitializeGameCardProps) {
  const handleClick = () => {
    if (!program || !publicKey) return;
    // Every genesis pet starts at 0.01 SOL (10,000,000 lamports) per spec.
    const prices = Array.from({ length: GENESIS_PET_COUNT }, () => DEFAULT_GENESIS_PRICE_LAMPORTS);
    run({
      key: ACTION_KEY,
      label: 'Initialize Genesis Pets',
      action: () => initializeGame(program, publicKey, prices),
      onSuccess,
    });
  };

  return (
    <Card className="admin-card">
      <h3 className="admin-card__title">1. Initialize Genesis Pets</h3>
      <p className="admin-card__description">
        Creates <code>GameConfig</code>, the Vault token account, and all 10 Pet PDAs — each priced
        at 0.01 SOL (10,000,000 lamports). One-time setup. The transaction automatically raises the
        compute unit limit to 400,000 so it doesn't hit the default 200k ceiling.
      </p>
      {checking ? (
        <p className="admin-card__status">Checking on-chain status…</p>
      ) : notInitialized ? (
        <Button
          type="primary"
          loading={pendingKey === ACTION_KEY}
          disabled={!program || !publicKey}
          onClick={handleClick}
        >
          Initialize Genesis Pets
        </Button>
      ) : (
        <Tag color="app-green" variant="soft">
          Already initialized
        </Tag>
      )}
    </Card>
  );
}
