import { Card, Title } from 'animal-island-ui';
import { HOW_IT_WORKS_STEPS } from '../../data/howItWorks';

/** 3-step explainer: Adopt/Snatch → Idle Harvest → Takeover Profit. */
export function HowItWorks() {
  return (
    <section className="section" id="how-it-works" aria-label="How It Works">
      <Title size="large" color="app-orange">
        How It Works
      </Title>
      <div className="how-it-works__grid">
        {HOW_IT_WORKS_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.step} className="how-it-works__card" hoverable>
              <span className="how-it-works__step-badge">{step.step}</span>
              <Icon size={30} className="how-it-works__icon" aria-hidden="true" />
              <h3 className="how-it-works__title">{step.title}</h3>
              <p className="how-it-works__description">{step.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
