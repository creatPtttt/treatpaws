// Content for the "Global Treat Vault Stats" 4-card grid.
import type { LucideIcon } from 'lucide-react';
import { Vault, PawPrint, Timer, ShieldCheck } from 'lucide-react';
import type { PetAccent } from './pets';

export interface VaultStat {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: PetAccent;
}

export const VAULT_STATS: VaultStat[] = [
  { icon: Vault, label: 'Treat Vault Reserve', value: '10,000,000 $TREAT', accent: 'app-teal' },
  { icon: PawPrint, label: 'Genesis Pets', value: '10 / 10 Unique', accent: 'app-yellow' },
  { icon: Timer, label: 'Base Production', value: '100 $TREAT / 10 Mins', accent: 'app-orange' },
  { icon: ShieldCheck, label: 'Smart Contract', value: 'Solana Devnet Anchor Program', accent: 'app-green' },
];
