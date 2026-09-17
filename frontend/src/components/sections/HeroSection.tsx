import { Card, Button } from 'animal-island-ui';
import { PixelPet } from '../ui/PixelPet';
import { useEnterGame } from '../../hooks/useEnterGame';

// Bounce colors for the playpen preview — matches the Genesis Pets palette.
const PLAYPEN_PETS = [
  { color: '#F8A6B2', delay: 0 },
  { color: '#82D5BB', delay: 0.15 },
  { color: '#F7CD67', delay: 0.3 },
  { color: '#889DF0', delay: 0.45 },
];

/**
 * Above-the-fold hero: headline + subtitle on the left, an animal-island-ui
 * <Card> "playpen" showing bouncing pixel companion placeholders on the
 * right, plus the two primary call-to-action buttons.
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

      {/* Central "playpen" — a parchment Card housing a few bouncing pet placeholders */}
      <Card className="hero__playpen" color="app-yellow" pattern="app-teal">
        <div className="hero__playpen-inner">
          {PLAYPEN_PETS.map((pet, index) => (
            <PixelPet key={index} color={pet.color} delay={pet.delay} size={72} />
          ))}
        </div>
        <p className="hero__playpen-caption">Genesis companions, idling away in the playpen</p>
      </Card>
    </section>
  );
}
