import { Collapse, Title } from 'animal-island-ui';
import { FAQ_ENTRIES } from '../../data/faq';

/** FAQ accordion built from stacked animal-island-ui <Collapse> panels. */
export function FaqSection() {
  return (
    <section className="section faq" id="faq" aria-label="Frequently Asked Questions">
      <Title size="large" color="app-blue">
        Frequently Asked Questions
      </Title>
      <div className="faq__list">
        {FAQ_ENTRIES.map((entry, index) => (
          <Collapse
            key={entry.id}
            question={entry.question}
            answer={entry.answer}
            defaultExpanded={index === 0}
          />
        ))}
      </div>
    </section>
  );
}
