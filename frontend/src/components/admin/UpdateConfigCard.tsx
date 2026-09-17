import { useState } from 'react';
import { Button, Card, Input } from 'animal-island-ui';
import type { Program } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';
import { updateGameConfig } from '../../anchor/instructions';
import type { GameConfigView } from '../../anchor/types';
import type { RunFn } from '../../hooks/useTransactionRunner';

interface UpdateConfigCardProps {
  program: Program | null;
  publicKey: PublicKey | null;
  gameConfig: GameConfigView | null;
  pendingKey: string | null;
  run: RunFn;
  onSuccess: () => void;
}

type FormState = Record<FieldKey, string>;
type FieldKey =
  | 'feeBasisPoints'
  | 'priceIncrementBps'
  | 'baseRewardRate'
  | 'boostRewardRate'
  | 'feedCost'
  | 'renameCost';

const EMPTY_FORM: FormState = {
  feeBasisPoints: '',
  priceIncrementBps: '',
  baseRewardRate: '',
  boostRewardRate: '',
  feedCost: '',
  renameCost: '',
};

const FIELDS: { key: FieldKey; label: string; currentValue: (config: GameConfigView) => number }[] = [
  { key: 'feeBasisPoints', label: 'Takeover fee (bps, 300 = 3%)', currentValue: (c) => c.feeBasisPoints },
  {
    key: 'priceIncrementBps',
    label: 'Price increment (bps, 1000 = 10%)',
    currentValue: (c) => c.priceIncrementBps,
  },
  { key: 'baseRewardRate', label: 'Base reward rate ($TREAT / 10 min)', currentValue: (c) => c.baseRewardRate },
  {
    key: 'boostRewardRate',
    label: 'Boost reward rate ($TREAT / 10 min)',
    currentValue: (c) => c.boostRewardRate,
  },
  { key: 'feedCost', label: 'Feed cost ($TREAT)', currentValue: (c) => c.feedCost },
  { key: 'renameCost', label: 'Rename cost ($TREAT)', currentValue: (c) => c.renameCost },
];

const ACTION_KEY = 'update-config';

/** Admin card #4: patch any subset of GameConfig's tunable economy knobs. */
export function UpdateConfigCard({
  program,
  publicKey,
  gameConfig,
  pendingKey,
  run,
  onSuccess,
}: UpdateConfigCardProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const setField = (key: FieldKey, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  // Blank field -> null (leave unchanged on-chain); otherwise parse to a number.
  const parseOrNull = (value: string): number | null => (value.trim() === '' ? null : Number(value));

  const handleClick = () => {
    if (!program || !publicKey) return;
    run({
      key: ACTION_KEY,
      label: 'Update game config',
      action: () =>
        updateGameConfig(program, publicKey, {
          feeBasisPoints: parseOrNull(form.feeBasisPoints),
          priceIncrementBps: parseOrNull(form.priceIncrementBps),
          baseRewardRate: parseOrNull(form.baseRewardRate),
          boostRewardRate: parseOrNull(form.boostRewardRate),
          feedCost: parseOrNull(form.feedCost),
          renameCost: parseOrNull(form.renameCost),
        }),
      onSuccess: () => {
        setForm(EMPTY_FORM);
        onSuccess();
      },
    });
  };

  return (
    <Card className="admin-card">
      <h3 className="admin-card__title">4. Update Game Config Knobs</h3>
      <p className="admin-card__description">
        Leave a field blank to keep its current on-chain value — only the fields you fill in are
        sent to <code>update_game_config</code>.
      </p>
      <div className="admin-card__grid">
        {FIELDS.map((field) => (
          <label key={field.key} className="admin-card__field">
            <span className="admin-card__field-label">
              {field.label}
              {gameConfig && <em className="admin-card__field-current"> (current: {field.currentValue(gameConfig)})</em>}
            </span>
            <Input
              type="number"
              placeholder="Unchanged"
              value={form[field.key]}
              onChange={(event) => setField(field.key, event.target.value)}
              allowClear
            />
          </label>
        ))}
      </div>
      <Button
        type="primary"
        loading={pendingKey === ACTION_KEY}
        disabled={!program || !publicKey}
        onClick={handleClick}
      >
        Update Config
      </Button>
    </Card>
  );
}
