import { Card, Title } from 'animal-island-ui';
import { VAULT_STATS } from '../../data/stats';

/** 4-card grid summarizing the global Treat Vault / game-wide numbers. */
export function VaultStats() {
  return (
    <section className="section vault-stats" aria-label="Global Treat Vault stats">
      <Title size="large" color="app-teal">
        Global Treat Vault
      </Title>
      <div className="vault-stats__grid">
        {VAULT_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} color={stat.accent} className="vault-stats__card" hoverable>
              <Icon size={28} className="vault-stats__icon" aria-hidden="true" />
              <p className="vault-stats__value">{stat.value}</p>
              <p className="vault-stats__label">{stat.label}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
