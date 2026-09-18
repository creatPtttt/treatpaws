import { useEffect, useRef, useState } from 'react';
import type { PublicKey } from '@solana/web3.js';
import type { GameConfigView, PetView } from '../../anchor/types';
import type { PetAiBounds } from '../../hooks/usePetAI';
import { RoamingPet } from './RoamingPet';

/** Fallback before the first ResizeObserver tick — CSS drives the real height. */
const FALLBACK_HEIGHT = 580;
const PET_SIZE = 80;
const CUSTOM_BG_SRC = '/playground-bg.png';

interface RoamingPlaygroundProps {
  pets: PetView[];
  gameConfig: GameConfigView;
  currentUser: PublicKey | null;
  pendingKey: string | null;
  onBuy: (pet: PetView) => void;
}

function buildInitialPositions(count: number, width: number, height: number, petSize: number) {
  const maxX = Math.max(0, width - petSize);
  const maxY = Math.max(0, height - petSize);
  // Keep pets on the lower ~65% (lawn), with a small sky margin at the top.
  const lawnTop = Math.max(48, height * 0.28);
  return Array.from({ length: count }, (_, index) => {
    const col = index % 5;
    const row = Math.floor(index / 5);
    const x = (maxX / 4) * col + ((index * 17) % 23);
    const y = lawnTop + row * Math.max(70, (maxY - lawnTop) * 0.42) + ((index * 13) % 19);
    return {
      x: Math.min(maxX, Math.max(0, x)),
      y: Math.min(maxY, Math.max(lawnTop, y)),
    };
  });
}

/**
 * Grassy Island Playground — bounded yard where genesis pets roam like
 * desktop mascots. Optionally skins the yard with `/playground-bg.png`.
 */
export function RoamingPlayground({
  pets,
  gameConfig,
  currentUser,
  pendingKey,
  onBuy,
}: RoamingPlaygroundProps) {
  const yardRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState<PetAiBounds>({
    width: 800,
    height: FALLBACK_HEIGHT,
    petSize: PET_SIZE,
  });
  // null = still probing; false = missing → CSS gradient fallback; true = use cover image.
  const [hasCustomBg, setHasCustomBg] = useState<boolean | null>(null);
  const [initials, setInitials] = useState<{ x: number; y: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled) setHasCustomBg(true);
    };
    probe.onerror = () => {
      if (!cancelled) setHasCustomBg(false);
    };
    probe.src = CUSTOM_BG_SRC;
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const node = yardRef.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(280, rect.width);
      const height = Math.max(360, Math.round(rect.height));
      setBounds({ width, height, petSize: PET_SIZE });
      // Place pets only after the real yard size is known (taller CSS height).
      setInitials((prev) => prev ?? buildInitialPositions(pets.length, width, height, PET_SIZE));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [pets.length]);

  const yardStyle = hasCustomBg
    ? {
        backgroundImage: `url(${CUSTOM_BG_SRC})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center 55%' as const,
        backgroundRepeat: 'no-repeat' as const,
      }
    : undefined;

  return (
    <div className="roaming-playground" aria-label="Island Roaming Playground">
      <p className="roaming-playground__hint">
        Your pets: click to pet, drag to move. Other trainers&apos; pets: click to snatch!
      </p>
      <div
        ref={yardRef}
        className={`roaming-playground__yard${hasCustomBg ? ' roaming-playground__yard--custom-bg' : ''}`}
        style={yardStyle}
      >
        {/* Decorative CSS sky/grass/fence only for the gradient fallback —
            the custom photo already includes lawn + picket fence. */}
        {!hasCustomBg && (
          <>
            <div className="roaming-playground__sky" aria-hidden="true" />
            <div className="roaming-playground__grass" aria-hidden="true" />
            <div className="roaming-playground__fence" aria-hidden="true" />
          </>
        )}

        {initials &&
          pets.map((pet, index) => (
            <RoamingPet
              key={pet.id}
              pet={pet}
              gameConfig={gameConfig}
              bounds={bounds}
              initial={initials[index] ?? { x: 24, y: 120 }}
              enabled={bounds.width > 0 && bounds.height > 0}
              currentUser={currentUser}
              pendingKey={pendingKey}
              onBuy={onBuy}
            />
          ))}
      </div>
    </div>
  );
}
