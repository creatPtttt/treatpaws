import { Card, Button } from 'animal-island-ui';
import { PetSprite } from '../ui/PetSprite';
import { getCreature } from '../../data/creatures';
import { useEnterGame } from '../../hooks/useEnterGame';

// A representative sample of 4 of the 10 real genesis pets (see
// src/data/creatures.ts), bouncing in the hero playpen preview.
const PREVIEW_PET_IDS = [1, 6, 9, 10];

/**
 * Above-the-fold hero: headline + subtitle on the left, an animal-island-ui
 * <Card> "playpen" showing a few of the real animated genesis companion
 * pets idling, plus the two primary call-to-action buttons.
 */
export function HeroSection() {
  // Same connect-then-navigate flow as the header's "Enter TreatPaws" CTA.
  const enterGame = useEnterGame();

  return (
    <section className="hero" id="top">
      <div className="hero__copy">
        <h1 className="hero__headline">Feed, Idle &amp; Earn on TreatPaws</h1>
        <p className="hero__subtitle">
          Adopt 1 of 10 genesis pixel pets, harvest $TREAT tokens every 10 minutes, or earn
          buyout profits when another player takes over!
        </p>
        <div className="hero__actions">
          <Button type="primary" size="large" onClick={enterGame}>
            Adopt Genesis Pet
          </Button>
          <a href="#how-it-works">
            <Button size="large">Trainer Manual</Button>
          </a>
        </div>
      </div>

      {/* Central "playpen" — a parchment Card housing a few of the real animated genesis pets */}
      <Card className="hero__playpen" color="app-yellow" pattern="app-teal">
        <div className="hero__playpen-inner">
          {PREVIEW_PET_IDS.map((petId) => (
            <PetSprite key={petId} creature={getCreature(petId)} size={72} />
          ))}
        </div>
        <p className="hero__playpen-caption">Genesis companions, idling away in the playpen</p>
      </Card>
    </section>
  );
}
