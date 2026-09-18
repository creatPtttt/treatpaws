// Maps each of the 10 genesis Pet ids (1-10, matching the on-chain Pet PDA
// `id` field) to a real animated companion pet sourced from the petdex.dev
// community gallery via `npx petdex install <slug>`.
//
// ATTRIBUTION: these sprites are community-submitted art, not TreatPaws'
// own. Authors are credited below per petdex's gallery norms. Before using
// them beyond a Devnet demo (mainnet launch, any commercial use), get
// explicit permission from each author or swap in commissioned art. The
// petdex CLI itself is MIT-licensed, but that does NOT extend to the
// individual pet artwork submitted by gallery users.
//
// Each spritesheet is a fixed grid per petdex's spec: 8 columns x 9 rows
// (1536x1872) or a "v2" 8 columns x 11 rows (1536x2288) for pets re-exported
// from newer ChatGPT pet exports — either way each frame is 192x208px, and
// row 0 is the idle animation (8 frames) that TreatPaws actually uses. The
// full sheets (with the other 8-10 unused animation-state rows) live at
// `~/.petdex/pets/<slug>/spritesheet.webp` after installing; only the
// cropped idle row is shipped to the browser (see `scripts/generate-pet-sprites.mjs`
// and `public/pets/<slug>/idle.webp`).
export interface Creature {
  /** petdex catalog slug — also the folder name under public/pets/. */
  slug: string;
  /** Real display name from the petdex gallery (for attribution, not shown as the pet's in-game name). */
  displayName: string;
  /** Gallery submitter, credited in this file's creature table. */
  author: string;
  /**
   * Number of REAL (non-transparent) frames in this pet's idle row, out of
   * the fixed 8-column grid. Not every idle animation uses all 8 columns —
   * shorter loops leave the trailing columns as blank padding. Measured
   * directly from each pet's `public/pets/<slug>/idle.webp` by sampling
   * average alpha per 192px-wide column; anything below column
   * `idleFrameCount` had non-zero alpha, everything from `idleFrameCount`
   * onward was exactly 0 (fully transparent). Getting this wrong makes
   * PetSprite's steps() animation land on a blank column and the pet
   * appears to vanish for a visible beat every loop.
   */
  idleFrameCount: number;
}

/** Frame size is identical across every pet in this lineup (see comment above). */
export const CREATURE_FRAME_WIDTH = 192;
export const CREATURE_FRAME_HEIGHT = 208;
/** Grid width — every pet's row is 8 columns, even if fewer are actually used (see `idleFrameCount`). */
export const CREATURE_GRID_COLUMNS = 8;

export const CREATURES: Record<number, Creature> = {
  1: { slug: 'mallow', displayName: 'Mallow', author: 'Aidil', idleFrameCount: 6 },
  2: { slug: 'boba', displayName: 'Boba', author: 'railly', idleFrameCount: 7 },
  3: { slug: 'shiba-4', displayName: 'Shiba', author: 'franksong2702', idleFrameCount: 6 },
  4: { slug: 'kuro', displayName: 'Kuro', author: 'newideas99', idleFrameCount: 6 },
  5: { slug: 'kero', displayName: 'Kero', author: 'lixwell', idleFrameCount: 6 },
  6: { slug: 'capy', displayName: 'Capy', author: 'yjcys', idleFrameCount: 6 },
  7: { slug: 'duck-lord', displayName: 'Duck Lord', author: 'zhiwei531', idleFrameCount: 8 },
  8: { slug: 'otterumells', displayName: 'Otterumells', author: 'winkpist95', idleFrameCount: 6 },
  9: { slug: 'bun', displayName: 'Bun', author: 'pipilu', idleFrameCount: 6 },
  10: { slug: 'penguin-chick', displayName: 'Emperor Penguin Chick', author: 'Nobita D.', idleFrameCount: 6 },
};

/** Looks up the creature for a genesis pet id, falling back to pet #1's if the id is somehow out of range. */
export function getCreature(petId: number): Creature {
  return CREATURES[petId] ?? CREATURES[1];
}

/** Local, pre-cropped idle-loop asset path (see scripts/generate-pet-sprites.mjs). */
export function getCreatureIdleAssetPath(slug: string): string {
  return `/pets/${slug}/idle.webp`;
}
