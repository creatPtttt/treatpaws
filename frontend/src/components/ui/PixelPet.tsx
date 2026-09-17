import type { CSSProperties } from 'react';

interface PixelPetProps {
  /** Body color — pass any hex from the animal-island-ui palette. */
  color: string;
  /** Staggers the bounce animation so a row of pets doesn't bounce in unison. */
  delay?: number;
  size?: number;
}

/**
 * Chunky, blocky "pixel companion" placeholder used in the Hero playpen card.
 * Built entirely from CSS boxes (no external art assets yet) so real pixel
 * sprites can drop in later without touching layout code — just swap this
 * component's JSX for an <img>/<Image> once art is ready.
 */
export function PixelPet({ color, delay = 0, size = 64 }: PixelPetProps) {
  return (
    <div
      className="pixel-pet"
      style={{ '--pixel-pet-color': color, '--pixel-pet-delay': `${delay}s`, width: size, height: size } as CSSProperties}
      aria-hidden="true"
    >
      <div className="pixel-pet__ear pixel-pet__ear--left" />
      <div className="pixel-pet__ear pixel-pet__ear--right" />
      <div className="pixel-pet__body">
        <div className="pixel-pet__eye pixel-pet__eye--left" />
        <div className="pixel-pet__eye pixel-pet__eye--right" />
        <div className="pixel-pet__nose" />
      </div>
    </div>
  );
}
