import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { Heart } from 'lucide-react';
import { useProgram } from '../anchor/useProgram';
import type { PetAction } from '../data/creatures';
import { getCreature } from '../data/creatures';
import { useCompanionGate } from '../context/CompanionGateContext';
import { usePets } from '../hooks/usePets';
import { ActionPetSprite } from './ui/ActionPetSprite';

const PET_SIZE = 64;
const CURSOR_BUFFER_PX = 70;
const FOLLOW_SPEED_PX_PER_SEC = 220;
const IDLE_AFTER_MS = 5_000;
const SLEEP_AFTER_MS = 15_000;

type FollowerMood = 'follow' | 'idle' | 'sleep';

/**
 * Global Option-B cursor companion: the trainer's primary owned pet trots
 * toward the mouse everywhere except the in-yard Roaming Playground.
 * Transit layer is pointer-events-none so it never blocks UI — only the
 * small pet hit-target accepts clicks (for a joyful ❤️).
 */
export function GlobalPetFollower() {
  const { publicKey } = useWallet();
  const program = useProgram();
  const { pets } = usePets(program);
  const { suppressFollower, followerEnabled, setCompanionAvailable } = useCompanionGate();
  const location = useLocation();

  const ownedPet =
    publicKey && pets
      ? pets.filter((pet) => pet.owner === publicKey.toBase58()).sort((a, b) => a.id - b.id)[0]
      : undefined;

  const companionAvailable = Boolean(ownedPet) && location.pathname !== '/admin';

  // Keep the header whistle in sync with ownership (even while resting / suppressed).
  useEffect(() => {
    setCompanionAvailable(companionAvailable);
    return () => setCompanionAvailable(false);
  }, [companionAvailable, setCompanionAvailable]);

  const active = companionAvailable && followerEnabled && !suppressFollower;

  const [pos, setPos] = useState({ x: 48, y: 120 });
  const [action, setAction] = useState<PetAction>('idle');
  const [mood, setMood] = useState<FollowerMood>('idle');
  const [hearts, setHearts] = useState<{ id: number; key: number }[]>([]);
  const heartIdRef = useRef(0);

  const posRef = useRef(pos);
  posRef.current = pos;
  const mouseRef = useRef({ x: 120, y: 160 });
  const lastMoveRef = useRef(performance.now());
  const actionRef = useRef<PetAction>('idle');
  const moodRef = useRef<FollowerMood>('idle');

  const spawnHeart = useCallback(() => {
    const id = heartIdRef.current;
    heartIdRef.current += 1;
    setHearts((list) => [...list, { id, key: id }]);
    window.setTimeout(() => {
      setHearts((list) => list.filter((heart) => heart.id !== id));
    }, 900);
  }, []);

  // Track cursor globally while the companion is active.
  useEffect(() => {
    if (!active) return;

    const onMove = (event: PointerEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
      lastMoveRef.current = performance.now();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [active]);

  // Smooth follow loop — single rAF, no layout thrash beyond transform.
  useEffect(() => {
    if (!active) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const mouse = mouseRef.current;
      const current = posRef.current;
      const centerX = current.x + PET_SIZE / 2;
      const centerY = current.y + PET_SIZE / 2;
      const dx = mouse.x - centerX;
      const dy = mouse.y - centerY;
      const dist = Math.hypot(dx, dy);
      const idleFor = now - lastMoveRef.current;

      let nextMood: FollowerMood = 'follow';
      let nextAction: PetAction = actionRef.current;

      if (dist > CURSOR_BUFFER_PX + 2) {
        nextMood = 'follow';
        const excess = dist - CURSOR_BUFFER_PX;
        const step = Math.min(FOLLOW_SPEED_PX_PER_SEC * dt, excess);
        const nx = dx / dist;
        const ny = dy / dist;
        const nextX = current.x + nx * step;
        const nextY = current.y + ny * step;
        // Keep the companion on-screen with a light margin.
        const maxX = Math.max(0, window.innerWidth - PET_SIZE);
        const maxY = Math.max(0, window.innerHeight - PET_SIZE);
        const clamped = {
          x: Math.min(maxX, Math.max(0, nextX)),
          y: Math.min(maxY, Math.max(0, nextY)),
        };
        posRef.current = clamped;
        setPos(clamped);
        nextAction = dx >= 0 ? 'runningRight' : 'runningLeft';
      } else if (idleFor >= SLEEP_AFTER_MS) {
        nextMood = 'sleep';
        nextAction = 'sleeping';
      } else if (idleFor >= IDLE_AFTER_MS) {
        nextMood = 'idle';
        nextAction = 'idle';
      } else if (dist <= CURSOR_BUFFER_PX + 8) {
        // Near the cursor and recently moved — settle into a calm idle.
        nextMood = 'idle';
        nextAction = 'idle';
      }

      if (nextAction !== actionRef.current) {
        actionRef.current = nextAction;
        setAction(nextAction);
      }
      if (nextMood !== moodRef.current) {
        moodRef.current = nextMood;
        setMood(nextMood);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active || !ownedPet) return null;

  const creature = getCreature(ownedPet.id);

  return (
    <div className="global-pet-follower" aria-hidden={false}>
      <div
        className="global-pet-follower__layer"
        style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
      >
        <button
          type="button"
          className="global-pet-follower__hit"
          aria-label={`${ownedPet.name}, your companion — click for a heart`}
          onClick={(event) => {
            event.stopPropagation();
            spawnHeart();
          }}
        >
          <ActionPetSprite creature={creature} action={action} size={PET_SIZE} />
          {mood === 'sleep' && (
            <span className="global-pet-follower__zzz" aria-hidden="true">
              <span>Z</span>
              <span>z</span>
              <span>z</span>
            </span>
          )}
          {hearts.map((heart) => (
            <span key={heart.key} className="global-pet-follower__heart" aria-hidden="true">
              <Heart size={16} fill="currentColor" />
            </span>
          ))}
        </button>
      </div>
    </div>
  );
}
