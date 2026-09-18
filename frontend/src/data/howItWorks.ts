// Content for the 3-step "How It Works" section.
import type { LucideIcon } from 'lucide-react';
import { Coins, Coffee, TrendingUp } from 'lucide-react';

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
    description:
      "Pick your favorite pixel companion with SOL! If someone else already adopted it, don't be shy: snatch it away with a sweet 10% premium. They'll even thank you for the extra profit!",
  },
  {
    step: 2,
    icon: Coffee,
    title: 'Bake & Snack',
    description:
      'Your pet works hard baking 100 delicious $TREAT tokens every 10 minutes. Kick back, sip your coffee, and let your treats pile up completely hands-free.',
  },
  {
    step: 3,
    icon: TrendingUp,
    title: 'Takeover Profit',
    description:
      'Someone snatched your pet? Cha-ching! You instantly get your full SOL back plus a 10% buyout profit, and all baked treats are sent straight to your wallet.',
  },
];
