import { Card, Title, Tag, Button } from 'animal-island-ui';
import { PetSprite } from '../ui/PetSprite';
import { GENESIS_PETS } from '../../data/pets';
import { getCreature } from '../../data/creatures';
import { useEnterGame } from '../../hooks/useEnterGame';

/**
 * 5x2 marketing preview of the 10 genesis pets, using placeholder data
 * (src/data/pets.ts) since this section renders on the public landing page
 * before a wallet is even connected. Every card button leads into the real,
 * on-chain Playpen at /playpen (connecting the wallet first if needed) —
 * that page is where actual buy/snatch transactions happen.
 */
export function PetsShowcase() {
  const enterGame = useEnterGame();

  return (
    <section className="section" id="pets" aria-label="10 Genesis Pets">
      <Title size="large" color="app-pink">
        10 Genesis Pets
      </Title>
      <div className="pets-grid">
        {GENESIS_PETS.map((pet) => (
          <Card key={pet.id} color={pet.accent} className="pets-grid__card" hoverable>
            <div className="pets-grid__avatar-wrap">
              <PetSprite creature={getCreature(pet.id)} size={56} />
            </div>
            <p className="pets-grid__id">Pet #{pet.id}</p>
            <p className="pets-grid__name">{pet.name}</p>
            <p className="pets-grid__price">{pet.priceSol} SOL</p>
            <Tag
              color={pet.status === 'available' ? 'app-green' : 'app-red'}
              variant={pet.status === 'available' ? 'solid' : 'soft'}
              size="small"
            >
              {pet.status === 'available' ? 'Available' : `Owned · ${pet.ownerShort}`}
            </Tag>
            <Button
              type={pet.status === 'available' ? 'primary' : 'default'}
              size="small"
              block
              className="pets-grid__button"
              onClick={enterGame}
            >
              {pet.status === 'available' ? 'Adopt' : 'Snatch'}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
