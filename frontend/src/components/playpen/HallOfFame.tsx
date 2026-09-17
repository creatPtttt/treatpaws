import { Card } from 'animal-island-ui';
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js';
import { Trophy } from 'lucide-react';
import type { PetView } from '../../anchor/types';
import { shortenAddress } from '../../wallet/format';

interface HallOfFameProps {
  pets: PetView[];
  currentUser: PublicKey | null;
}

// Gold / silver / bronze — intentionally outside the animal-island-ui
// palette since medal colors are a fixed real-world convention, not a
// themeable brand color.
const MEDAL_COLORS = ['#f5c31c', '#c0c0c0', '#cd7f32'];

/** Ranks the 10 genesis pets by current SOL valuation, highest first. */
export function HallOfFame({ pets, currentUser }: HallOfFameProps) {
  const ranked = [...pets].sort((a, b) => b.currentPriceLamports - a.currentPriceLamports);

  return (
    <div className="hall-of-fame">
      {ranked.map((pet, index) => {
        const isMine = currentUser !== null && currentUser.toBase58() === pet.owner;
        const medalColor = MEDAL_COLORS[index];

        return (
          <Card key={pet.id} hoverable className="hall-of-fame__row">
            <div className="hall-of-fame__rank" style={medalColor ? { color: medalColor } : undefined}>
              {medalColor ? <Trophy size={22} /> : <span>#{index + 1}</span>}
            </div>
            <div className="hall-of-fame__info">
              <p className="hall-of-fame__name">
                Pet #{pet.id} · {pet.name}
              </p>
              <p className="hall-of-fame__owner" title={pet.owner}>
                {shortenAddress(pet.owner)}
                {isMine ? ' (You)' : ''}
              </p>
            </div>
            <p className="hall-of-fame__price">{(pet.currentPriceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL</p>
          </Card>
        );
      })}
    </div>
  );
}
