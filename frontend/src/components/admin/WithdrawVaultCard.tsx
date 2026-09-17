import { useState } from 'react';
import { Button, Card, Input, Modal } from 'animal-island-ui';
import type { Program } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';
import confetti from 'canvas-confetti';
import { withdrawVault } from '../../anchor/instructions';
import type { RunFn } from '../../hooks/useTransactionRunner';

interface WithdrawVaultCardProps {
  program: Program | null;
  publicKey: PublicKey | null;
  decimals: number;
  decimalsLoaded: boolean;
  /** Whole $TREAT currently sitting in the Vault PDA (null = not on-chain yet). */
  vaultUiAmount: number | null;
  /** Exact RPC UI string used by the Max button so we don't round away dust. */
  vaultUiAmountString: string | null;
  vaultLoaded: boolean;
  pendingKey: string | null;
  run: RunFn;
  onSuccess: () => void;
}

const ACTION_KEY = 'withdraw';

/** Brand-palette burst used after a confirmed emergency withdrawal. */
const CELEBRATION_COLORS = ['#19c8b9', '#f5c31c', '#8ac68a', '#e59266', '#f8a6b2'];

function fireCelebration() {
  void confetti({
    particleCount: 120,
    spread: 70,
    startVelocity: 40,
    origin: { y: 0.65 },
    colors: CELEBRATION_COLORS,
  });
}

/** Admin card #3: emergency transfer of $TREAT from the Vault PDA back to the admin ATA. */
export function WithdrawVaultCard({
  program,
  publicKey,
  decimals,
  decimalsLoaded,
  vaultUiAmount,
  vaultUiAmountString,
  vaultLoaded,
  pendingKey,
  run,
  onSuccess,
}: WithdrawVaultCardProps) {
  const [amount, setAmount] = useState('');
  // Confirmation modal stays closed until the danger button is pressed.
  const [confirmOpen, setConfirmOpen] = useState(false);

  const parsedAmount = Number(amount);
  const isValid = amount.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const vaultHasFunds = vaultUiAmount != null && vaultUiAmount > 0;
  // Allow a tiny float epsilon so Max-filled amounts aren't rejected as "over".
  const exceedsVault = vaultUiAmount != null && isValid && parsedAmount > vaultUiAmount + 1e-9;
  const canWithdraw = Boolean(program && publicKey && isValid && vaultHasFunds && !exceedsVault);
  const isPending = pendingKey === ACTION_KEY;

  // Quick action: fill the input with the entire remaining vault balance.
  const handleMax = () => {
    if (!vaultUiAmountString || !vaultHasFunds) return;
    setAmount(vaultUiAmountString);
  };

  const closeConfirm = () => {
    // Don't dismiss the dialog while the wallet popup / RPC confirm is in flight.
    if (isPending) return;
    setConfirmOpen(false);
  };

  const handleConfirm = () => {
    if (!program || !publicKey || !canWithdraw) return;
    run({
      key: ACTION_KEY,
      label: `Withdraw ${parsedAmount.toLocaleString()} $TREAT`,
      // `mintDecimals` is applied inside the instruction builder (whole $TREAT -> raw u64).
      action: () => withdrawVault(program, publicKey, parsedAmount, decimals),
      onSuccess: () => {
        setAmount('');
        setConfirmOpen(false);
        fireCelebration();
        onSuccess();
      },
    });
  };

  return (
    <Card className="admin-card">
      <h3 className="admin-card__title">3. Withdraw $TREAT from Vault</h3>
      <p className="admin-card__description">
        Emergency retrieval — transfers $TREAT from the Vault PDA back to your wallet's ATA.
        Player claims will fail if the vault runs dry, so only use this when you mean it.
        {!decimalsLoaded && ' Mint not found on Devnet yet — using 6 decimals as a fallback.'}
      </p>

      <p className="admin-card__vault-balance">
        {vaultLoaded
          ? vaultUiAmountString != null
            ? <>Vault remaining: <span className="admin-card__vault-balance-value">{Number(vaultUiAmountString).toLocaleString()} $TREAT</span></>
            : 'Vault not found — initialize the game first.'
          : 'Reading vault balance…'}
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
        <Button onClick={handleMax} disabled={!vaultHasFunds}>
          Max
        </Button>
      </div>

      {exceedsVault && (
        <p className="admin-card__status">That amount is more than the vault currently holds.</p>
      )}

      <Button
        type="primary"
        danger
        loading={isPending}
        disabled={!canWithdraw}
        onClick={() => setConfirmOpen(true)}
      >
        Withdraw from Vault
      </Button>

      <Modal
        open={confirmOpen}
        title="Withdraw from the Treat Vault?"
        onClose={closeConfirm}
        typewriter={false}
        footer={
          <>
            <Button onClick={closeConfirm} disabled={isPending}>
              Cancel
            </Button>
            <Button type="primary" danger loading={isPending} disabled={!canWithdraw} onClick={handleConfirm}>
              Confirm Withdraw
            </Button>
          </>
        }
      >
        This sends <strong>{isValid ? parsedAmount.toLocaleString() : '0'} $TREAT</strong> from the
        Vault PDA back to your admin ATA. Claims, feeds, and renames will fail if the vault is left
        empty — this cannot be undone on-chain.
      </Modal>
    </Card>
  );
}
