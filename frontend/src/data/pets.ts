// Placeholder Genesis Pet catalog for the landing page. Real prices / owners
// will come from the on-chain `Pet` PDAs once the client is wired up — these
// values only exist so the showcase section has believable content to render.

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

export interface GenesisPet {
  id: number;
  name: string;
  priceSol: number;
  status: 'available' | 'owned';
  ownerShort?: string;
  accent: PetAccent;
}

export const GENESIS_PETS: GenesisPet[] = [
  { id: 1, name: 'Biscuit', priceSol: 0.01, status: 'available', accent: 'app-pink' },
  { id: 2, name: 'Marmalade', priceSol: 0.012, status: 'owned', ownerShort: '7xK…9A', accent: 'app-orange' },
  { id: 3, name: 'Waffle', priceSol: 0.011, status: 'available', accent: 'app-yellow' },
  { id: 4, name: 'Clover', priceSol: 0.014, status: 'owned', ownerShort: '3xM…4F', accent: 'app-green' },
  { id: 5, name: 'Pretzel', priceSol: 0.013, status: 'available', accent: 'brown' },
  { id: 6, name: 'Honeydew', priceSol: 0.016, status: 'owned', ownerShort: '9pQ…2Z', accent: 'lime-green' },
  { id: 7, name: 'Mochi', priceSol: 0.01, status: 'available', accent: 'purple' },
  { id: 8, name: 'Ginger', priceSol: 0.018, status: 'owned', ownerShort: '4rT…1L', accent: 'app-blue' },
  { id: 9, name: 'Praline', priceSol: 0.015, status: 'available', accent: 'warm-peach-pink' },
  { id: 10, name: 'Butterscotch', priceSol: 0.02, status: 'owned', ownerShort: '6zV…8C', accent: 'yellow-green' },
];
