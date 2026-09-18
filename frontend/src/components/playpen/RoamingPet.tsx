import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { LAMPORTS_PER_SOL, type PublicKey } from '@solana/web3.js';
import { Button } from 'animal-island-ui';
import { Heart } from 'lucide-react';
import type { GameConfigView, PetView } from '../../anchor/types';
import { getCreature } from '../../data/creatures';
import { useLiveRewards } from '../../hooks/useLiveRewards';
import { usePetAI, type PetAiBounds } from '../../hooks/usePetAI';
import { shortenAddress } from '../../wallet/format';
import { ActionPetSprite } from '../ui/ActionPetSprite';

interface RoamingPetProps {
  pet: PetView;
  gameConfig: GameConfigView;
  bounds: PetAiBounds;
  initial: { x: number; y: number };
  enabled: boolean;
  /** Connected wallet — compared to `pet.owner` for strict ownership. */
  currentUser: PublicKey | null;
  pendingKey: string | null;
  onBuy: (pet: PetView) => void;
}

/**
 * One free-roaming genesis pet: AI brain + spritesheet actions.
 * Owners can pet + drag; visitors get a snatch pitch instead of pickup.
 */
export function RoamingPet({
  pet,
  gameConfig,
  bounds,
  initial,
  enabled,
  currentUser,
  pendingKey,
  onBuy,
}: RoamingPetProps) {
  const creature = getCreature(pet.id);
  const { pending } = useLiveRewards(pet, gameConfig);
  const { mode, action, x, y, triggerPet, haltBriefly, startDrag, updateDragPosition, endDrag } =
    usePetAI({
      bounds,
      initial,
      enabled,
    });

  // PetView.owner is already base58 — match the connected wallet the same way.
  const isMine = currentUser !== null && pet.owner === currentUser.toBase58();

  const [hovering, setHovering] = useState(false);
  const [snatchOpen, setSnatchOpen] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; key: number }[]>([]);
  const heartIdRef = useRef(0);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  const priceSol = pet.currentPriceLamports / LAMPORTS_PER_SOL;
  const priceLabel = priceSol.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const buying = pendingKey === `buy-${pet.id}`;

  // Auto-dismiss the snatch pitch after a short beat so the yard stays tidy.
  useEffect(() => {
    if (!snatchOpen) return;
    const timer = window.setTimeout(() => setSnatchOpen(false), 8000);
    return () => window.clearTimeout(timer);
  }, [snatchOpen]);

  const spawnHeart = useCallback(() => {
    const id = heartIdRef.current;
    heartIdRef.current += 1;
    setHearts((list) => [...list, { id, key: id }]);
    window.setTimeout(() => {
      setHearts((list) => list.filter((heart) => heart.id !== id));
    }, 900);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // Visitors cannot pick up someone else's pet — click opens snatch pitch.
    if (!isMine) {
      event.preventDefault();
      didDragRef.current = false;
      haltBriefly();
      setSnatchOpen(true);
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    didDragRef.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    startDrag();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMine) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const parent = event.currentTarget.offsetParent as HTMLElement | null;
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const nextX = event.clientX - parentRect.left - dragOffsetRef.current.x;
    const nextY = event.clientY - parentRect.top - dragOffsetRef.current.y;
    if (Math.hypot(nextX - x, nextY - y) > 3) didDragRef.current = true;
    updateDragPosition(nextX, nextY);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMine) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    endDrag();
    // A click (no real drag) counts as a gentle pet.
    if (!didDragRef.current) {
      triggerPet();
      spawnHeart();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        'roaming-pet',
        isMine ? 'roaming-pet--mine' : 'roaming-pet--visitor',
        mode === 'drag' ? 'roaming-pet--dragging' : '',
        mode === 'pet' ? 'roaming-pet--bounce' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        width: bounds.petSize,
        height: bounds.petSize,
        zIndex: mode === 'drag' || snatchOpen ? 20 : mode === 'sleep' ? 2 : 5,
      }}
      aria-label={
        isMine
          ? `${pet.name}, your pet — click to pet, drag to move`
          : `${pet.name}, owned by ${shortenAddress(pet.owner)} — click to snatch`
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (!isMine) {
          haltBriefly();
          setSnatchOpen(true);
          return;
        }
        triggerPet();
        spawnHeart();
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <ActionPetSprite creature={creature} action={action} size={bounds.petSize} />

      {mode === 'sleep' && (
        <span className="roaming-pet__zzz" aria-hidden="true">
          <span>Z</span>
          <span>z</span>
          <span>z</span>
        </span>
      )}

      {hearts.map((heart) => (
        <span key={heart.key} className="roaming-pet__heart" aria-hidden="true">
          <Heart size={18} fill="currentColor" />
        </span>
      ))}

      {snatchOpen && !isMine && (
        <div
          className="roaming-pet__snatch"
          role="dialog"
          aria-label={`Snatch ${pet.name}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="roaming-pet__snatch-copy">
            I belong to {shortenAddress(pet.owner)}! Snatch me for {priceLabel} SOL to take me home!
          </p>
          <Button
            type="primary"
            size="small"
            loading={buying}
            disabled={buying || !currentUser}
            onClick={() => onBuy(pet)}
          >
            Snatch for {priceLabel} SOL
          </Button>
        </div>
      )}

      {hovering && !snatchOpen && mode !== 'drag' && (
        <div className="roaming-pet__bubble" role="tooltip">
          <strong className="roaming-pet__bubble-name">{pet.name}</strong>
          <span>{priceLabel} SOL</span>
          <span>+{pending.toFixed(2)} $TREAT</span>
          {!isMine && <span className="roaming-pet__bubble-owner">Owner · {shortenAddress(pet.owner)}</span>}
        </div>
      )}
    </div>
  );
}
