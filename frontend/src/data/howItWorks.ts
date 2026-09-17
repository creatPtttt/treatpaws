// Content for the 3-step "How It Works" section.
import type { LucideIcon } from 'lucide-react';
import { Coins, Clock, TrendingUp } from 'lucide-react';

export interface HowItWorksStep {
  step: number;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    step: 1,
    icon: Coins,
    title: 'Adopt or Snatch',
    description: 'Buy any of the 10 genesis pets with native SOL at incremental prices — or take one over from another trainer.',
  },
  {
    step: 2,
    icon: Clock,
    title: 'Idle Harvest',
    description: 'Your pet bakes 100 $TREAT every 10 minutes automatically. No clicking, no farming — just let it idle.',
  },
  {
    step: 3,
    icon: TrendingUp,
    title: 'Takeover Profit',
    description: "When someone snatches your pet, you're paid out instantly: your principal plus a 10% profit on top.",
  },
];
