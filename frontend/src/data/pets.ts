// Card accent colors for the 10 genesis pets (id 1-10). Live names, prices,
// and owners come from on-chain Pet PDAs — this file only keeps the palette.

/** One of the 13 palette colors accepted by the Card / Tag components. */
export type PetAccent =
  | 'app-pink'
  | 'purple'
  | 'app-blue'
  | 'app-yellow'
  | 'app-orange'
  | 'app-teal'
  | 'app-green'
  | 'lime-green'
  | 'yellow-green'
  | 'warm-peach-pink'
  | 'brown';

const PET_CARD_ACCENTS: PetAccent[] = [
  'app-pink',
  'app-orange',
  'app-yellow',
  'app-green',
  'brown',
  'lime-green',
  'purple',
  'app-blue',
  'warm-peach-pink',
  'yellow-green',
];

/** Palette color for genesis pet `id` (1-indexed). */
export function getPetAccent(id: number): PetAccent {
  return PET_CARD_ACCENTS[(id - 1 + PET_CARD_ACCENTS.length) % PET_CARD_ACCENTS.length];
}
