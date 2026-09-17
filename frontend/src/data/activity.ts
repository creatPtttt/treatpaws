// Mock "live" island activity for the scrolling ticker. A real implementation
// would subscribe to program logs / indexed events instead of this static list.
import type { LucideIcon } from 'lucide-react';
import { Bone, Crown, Coins, Sparkles } from 'lucide-react';

export interface ActivityItem {
  icon: LucideIcon;
  text: string;
}

export const ACTIVITY_FEED: ActivityItem[] = [
  { icon: Bone, text: '7xK…9A fed Pet #3 with 500 $TREAT!' },
  { icon: Crown, text: '3xM…4F took over Pet #5!' },
  { icon: Coins, text: '9pQ…2Z claimed 620 $TREAT from Pet #8' },
  { icon: Sparkles, text: '4rT…1L renamed Pet #1 to "Biscuit"' },
  { icon: Bone, text: '6zV…8C fed Pet #10 — Snack Boost active for 24h' },
  { icon: Crown, text: '2hL…6Q snatched Pet #2 for 0.012 SOL' },
  { icon: Coins, text: '8wS…3D harvested 1,440 $TREAT idle rewards' },
];
