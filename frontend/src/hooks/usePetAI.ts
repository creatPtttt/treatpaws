import { useCallback, useEffect, useRef, useState } from 'react';
import type { PetAction } from '../data/creatures';

export type PetAiMode = 'idle' | 'wander' | 'sleep' | 'pet' | 'drag';

export interface PetAiBounds {
  width: number;
  height: number;
  /** Pixel size of the drawn pet (used so feet stay inside the fence). */
  petSize: number;
}

export interface PetAiState {
  mode: PetAiMode;
  /** Spritesheet action currently playing. */
  action: PetAction;
  x: number;
  y: number;
}

interface UsePetAIOptions {
  bounds: PetAiBounds;
  /** Seeded starting position so 10 pets don't spawn on top of each other. */
  initial: { x: number; y: number };
  /** When true the AI loop pauses (e.g. tab hidden). */
  enabled?: boolean;
}

const WALK_SPEED_PX_PER_SEC = 42;
const PET_REACTION_MS = 900;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pickWanderTarget(bounds: PetAiBounds, fromX: number, fromY: number): { x: number; y: number } {
  const maxX = Math.max(0, bounds.width - bounds.petSize);
  const maxY = Math.max(0, bounds.height - bounds.petSize);
  // Prefer a nearby hop rather than teleporting across the whole yard.
  const radius = Math.min(180, Math.max(80, bounds.width * 0.28));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randomBetween(radius * 0.35, radius);
    const x = clamp(fromX + Math.cos(angle) * dist, 0, maxX);
    const y = clamp(fromY + Math.sin(angle) * dist, 0, maxY);
    if (Math.hypot(x - fromX, y - fromY) > 24) return { x, y };
  }
  return { x: clamp(fromX, 0, maxX), y: clamp(fromY, 0, maxY) };
}

/**
 * Autonomous desktop-mascot brain: idle → wander → occasional nap, with
 * interruptible pet/drag modes. Keeps the pet strictly inside `bounds`.
 */
export function usePetAI({ bounds, initial, enabled = true }: UsePetAIOptions) {
  const [state, setState] = useState<PetAiState>(() => ({
    mode: 'idle',
    action: 'idle',
    x: initial.x,
    y: initial.y,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const modeUntilRef = useRef(performance.now() + randomBetween(3000, 6000));
  const dragRef = useRef(false);

  const clampToBounds = useCallback((x: number, y: number) => {
    const b = boundsRef.current;
    const maxX = Math.max(0, b.width - b.petSize);
    const maxY = Math.max(0, b.height - b.petSize);
    return { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) };
  }, []);

  const beginIdle = useCallback((now: number) => {
    targetRef.current = null;
    modeUntilRef.current = now + randomBetween(3000, 6000);
    setState((prev) => ({ ...prev, mode: 'idle', action: 'idle' }));
  }, []);

  const beginWander = useCallback(
    (now: number) => {
      const current = stateRef.current;
      const target = pickWanderTarget(boundsRef.current, current.x, current.y);
      targetRef.current = target;
      modeUntilRef.current = now + 12_000;
      const action: PetAction = target.x >= current.x ? 'runningRight' : 'runningLeft';
      setState((prev) => ({ ...prev, mode: 'wander', action }));
    },
    [],
  );

  const beginSleep = useCallback((now: number) => {
    targetRef.current = null;
    modeUntilRef.current = now + randomBetween(10_000, 15_000);
    setState((prev) => ({ ...prev, mode: 'sleep', action: 'sleeping' }));
  }, []);

  const scheduleNextAutonomous = useCallback(
    (now: number) => {
      const roll = Math.random();
      if (roll < 0.18) beginSleep(now);
      else if (roll < 0.55) beginWander(now);
      else beginIdle(now);
    },
    [beginIdle, beginSleep, beginWander],
  );

  /** Click-to-pet: pause roaming, play jump, float a heart (handled by UI). */
  const triggerPet = useCallback(() => {
    if (dragRef.current) return;
    const now = performance.now();
    targetRef.current = null;
    modeUntilRef.current = now + PET_REACTION_MS;
    setState((prev) => ({ ...prev, mode: 'pet', action: 'jumping' }));
  }, []);

  /** Soft halt used when a non-owner taps a pet (snatch pitch) — no jump/heart. */
  const haltBriefly = useCallback((durationMs = 2500) => {
    if (dragRef.current) return;
    const now = performance.now();
    targetRef.current = null;
    modeUntilRef.current = now + durationMs;
    setState((prev) => ({ ...prev, mode: 'idle', action: 'idle' }));
  }, []);

  const startDrag = useCallback(() => {
    dragRef.current = true;
    targetRef.current = null;
    setState((prev) => ({ ...prev, mode: 'drag', action: 'jumping' }));
  }, []);

  const updateDragPosition = useCallback(
    (x: number, y: number) => {
      if (!dragRef.current) return;
      const next = clampToBounds(x, y);
      setState((prev) => ({ ...prev, x: next.x, y: next.y, mode: 'drag', action: 'jumping' }));
    },
    [clampToBounds],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = false;
    const now = performance.now();
    // Soft landing: brief jump pose, then idle.
    modeUntilRef.current = now + 500;
    setState((prev) => {
      const next = clampToBounds(prev.x, prev.y);
      return { ...prev, ...next, mode: 'pet', action: 'jumping' };
    });
  }, [clampToBounds]);

  // Re-clamp when the playpen resizes.
  useEffect(() => {
    setState((prev) => {
      const next = clampToBounds(prev.x, prev.y);
      if (next.x === prev.x && next.y === prev.y) return prev;
      return { ...prev, ...next };
    });
  }, [bounds.width, bounds.height, bounds.petSize, clampToBounds]);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (dragRef.current) return;

      const current = stateRef.current;

      if (current.mode === 'pet') {
        if (now >= modeUntilRef.current) beginIdle(now);
        return;
      }

      if (current.mode === 'wander' && targetRef.current) {
        const target = targetRef.current;
        const dx = target.x - current.x;
        const dy = target.y - current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) {
          scheduleNextAutonomous(now);
          return;
        }
        const step = WALK_SPEED_PX_PER_SEC * dt;
        const ratio = Math.min(1, step / dist);
        const nextX = current.x + dx * ratio;
        const nextY = current.y + dy * ratio;
        const action: PetAction = dx >= 0 ? 'runningRight' : 'runningLeft';
        const clamped = clampToBounds(nextX, nextY);
        setState((prev) => ({ ...prev, ...clamped, mode: 'wander', action }));
        if (now >= modeUntilRef.current) scheduleNextAutonomous(now);
        return;
      }

      if (now >= modeUntilRef.current) {
        scheduleNextAutonomous(now);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, beginIdle, clampToBounds, scheduleNextAutonomous]);

  return {
    ...state,
    triggerPet,
    haltBriefly,
    startDrag,
    updateDragPosition,
    endDrag,
  };
}
