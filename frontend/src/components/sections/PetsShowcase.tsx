import { Card, Title, Tag, Button, Skeleton } from 'animal-island-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PetSprite } from '../ui/PetSprite';
import { getPetAccent } from '../../data/pets';
import { getCreature } from '../../data/creatures';
import { GENESIS_PET_COUNT } from '../../data/chain';
import { useEnterGame } from '../../hooks/useEnterGame';
import { isAvailable, useCachedShowcasePets } from '../../hooks/useCachedShowcasePets';
import { shortenAddress } from '../../wallet/format';

/** Formats on-chain lamports as a tidy SOL price, e.g. `0.0146 SOL`. */
function formatPetPrice(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  return `${sol.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;
}

/**
 * 5x2 marketing preview of the 10 genesis pets, driven by live on-chain
 * Pet PDAs (name, price, owner) with a 2-minute sessionStorage cache so
 * landing-page reloads do not spam RPC. Every card button still leads into
 * the real Playpen at /playpen.
 */
export function PetsShowcase() {
  const enterGame = useEnterGame();
  const { pets, loading } = useCachedShowcasePets();
  const petsById = new Map(pets.map((pet) => [pet.id, pet]));

  return (
    <section className="section" id="pets" aria-label="10 Genesis Pets">
      <Title size="large" color="app-pink">
        10 Genesis Pets
      </Title>
      <div className="pets-grid">
        {loading
          ? Array.from({ length: GENESIS_PET_COUNT }, (_, index) => (
              <Card key={`skeleton-${index}`} className="pets-grid__card">
                <div className="pets-grid__avatar-wrap">
                  <Skeleton variant="circle" active widthValue={56} heightValue={56} />
                </div>
                <Skeleton variant="text" active width="40%" />
                <Skeleton variant="text" active width="70%" />
                <Skeleton variant="text" active width="50%" />
              </Card>
            ))
          : Array.from({ length: GENESIS_PET_COUNT }, (_, index) => {
              const id = index + 1;
              const onChain = petsById.get(id);
              const available = !onChain || isAvailable(onChain);
              const name = onChain?.name?.trim() ? onChain.name : `Pet #${id}`;
              const priceLabel = onChain ? formatPetPrice(onChain.currentPriceLamports) : 'Soon';
              return (
                <Card key={id} color={getPetAccent(id)} className="pets-grid__card" hoverable>
                  <div className="pets-grid__avatar-wrap">
                    <PetSprite creature={getCreature(id)} size={56} />
                  </div>
                  <p className="pets-grid__id">Pet #{id}</p>
                  <p className="pets-grid__name">{name}</p>
                  <p className="pets-grid__price">{priceLabel}</p>
                  <Tag
                    color={available ? 'app-green' : 'app-red'}
                    variant={available ? 'solid' : 'soft'}
                    size="small"
                  >
                    {onChain && !available ? `Owned · ${shortenAddress(onChain.owner)}` : 'Available'}
                  </Tag>
                  <Button
                    type={available ? 'primary' : 'default'}
                    size="small"
                    block
                    className="pets-grid__button"
                    onClick={enterGame}
                  >
                    {available ? 'Adopt' : 'Snatch'}
                  </Button>
                </Card>
              );
            })}
      </div>
    </section>
  );
}
