import { HeroSection } from '../components/sections/HeroSection';
import { VaultStats } from '../components/sections/VaultStats';
import { HowItWorks } from '../components/sections/HowItWorks';
import { PetsShowcase } from '../components/sections/PetsShowcase';
import { YieldCalculator } from '../components/sections/YieldCalculator';
import { FaqSection } from '../components/sections/FaqSection';

/** Marketing home page ("/") — everything above the game hall. */
export function LandingPage() {
  return (
    <>
      <HeroSection />
      <VaultStats />
      <HowItWorks />
      <PetsShowcase />
      <YieldCalculator />
      <FaqSection />
    </>
  );
}
