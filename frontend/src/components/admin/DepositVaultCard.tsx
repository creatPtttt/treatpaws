import { useState } from 'react';
import { Button, Card, Input } from 'animal-island-ui';
import type { Program } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';
import { depositVault } from '../../anchor/instructions';
import type { RunFn } from '../../hooks/useTransactionRunner';

interface DepositVaultCardProps {
  program: Program | null;
  publicKey: PublicKey | null;
  decimals: number;
  decimalsLoaded: boolean;
  pendingKey: string | null;
  run: RunFn;
  onSuccess: () => void;
}

const ACTION_KEY = 'deposit';

/** Admin card #2: transfer $TREAT from the admin's ATA into the Vault PDA. */
export function DepositVaultCard({
  program,
  publicKey,
  decimals,
  decimalsLoaded,
  pendingKey,
  run,
  onSuccess,
}: DepositVaultCardProps) {
  const [amount, setAmount] = useState('');
  const parsedAmount = Number(amount);
  const isValid = amount.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;

  const handleClick = () => {
    if (!program || !publicKey || !isValid) return;
    // Whole $TREAT -> raw u64 using the mint's actual decimals.
    const rawAmount = Math.round(parsedAmount * 10 ** decimals);
    run({
      key: ACTION_KEY,
      label: `Deposit ${parsedAmount.toLocaleString()} $TREAT`,
      action: () => depositVault(program, publicKey, rawAmount),
      onSuccess: () => {
        setAmount('');
        onSuccess();
      },
    });
  };

  return (
    <Card className="admin-card">
      <h3 className="admin-card__title">2. Deposit $TREAT to Vault</h3>
      <p className="admin-card__description">
        Transfers $TREAT from your wallet's ATA into the game's Vault PDA so player claims have
        something to pay out. Creates your ATA first if it doesn't exist yet.
        {!decimalsLoaded && ' Mint not found on Devnet yet — using 6 decimals as a fallback.'}
      </p>
      <div className="admin-card__row">
        <Input
          type="number"
          min={0}
          step="any"
          placeholder="Amount of $TREAT"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          allowClear
        />
        <Button
          type="primary"
          loading={pendingKey === ACTION_KEY}
          disabled={!program || !publicKey || !isValid}
          onClick={handleClick}
        >
          Deposit
        </Button>
      </div>
    </Card>
  );
}
