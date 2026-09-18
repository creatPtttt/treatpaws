import { memo, type CSSProperties } from 'react';
import cn from 'classnames';
import {
  CREATURE_FRAME_HEIGHT,
  CREATURE_FRAME_WIDTH,
  getActionFrameCount,
  getCreatureSpritesheetPath,
  PET_ACTION_ROWS,
  type Creature,
  type PetAction,
} from '../../data/creatures';

interface ActionPetSpriteProps {
  creature: Creature;
  /** Which petdex sheet row to play. */
  action?: PetAction;
  /** Rendered height in px — width preserves the 192:208 frame aspect. */
  size?: number;
  className?: string;
}

/**
 * Plays one action row from the full multi-row petdex spritesheet
 * (`public/pets/<slug>/spritesheet.webp`) via CSS steps() — idle, walk,
 * jump, or sleep. Used by the Island Playground roamers.
 */
function ActionPetSpriteImpl({
  creature,
  action = 'idle',
  size = 64,
  className,
}: ActionPetSpriteProps) {
  const scale = size / CREATURE_FRAME_HEIGHT;
  const displayWidth = CREATURE_FRAME_WIDTH * scale;
  const frameCount = getActionFrameCount(creature, action);
  const cycleDistance = (frameCount - 1) * CREATURE_FRAME_WIDTH;
  const rowY = PET_ACTION_ROWS[action] * CREATURE_FRAME_HEIGHT;

  const frameStyle = {
    backgroundImage: `url(${getCreatureSpritesheetPath(creature.slug)})`,
    backgroundPositionY: `-${rowY}px`,
    '--pet-sprite-scale': scale,
    '--pet-sprite-cycle-x': `-${cycleDistance}px`,
    '--pet-sprite-steps': frameCount - 1,
  } as CSSProperties;

  return (
    <span
      className={cn('pet-sprite', 'action-pet-sprite', className)}
      style={{ width: displayWidth, height: size }}
      role="img"
      aria-label={`${creature.displayName} ${action}`}
    >
      <span className="pet-sprite__frame" style={frameStyle} />
    </span>
  );
}

export const ActionPetSprite = memo(ActionPetSpriteImpl);
