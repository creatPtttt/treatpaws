import { Card, Title, Skeleton } from 'animal-island-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { VAULT_STATS } from '../../data/stats';
import { formatTreatReserve, useCachedVaultReserve } from '../../hooks/useCachedVaultReserve';

/** 4-card grid summarizing the global Treat Vault / game-wide numbers. */
export function VaultStats() {
  const { connection } = useConnection();
  const { uiAmount, uiAmountString, loaded } = useCachedVaultReserve(connection);
  const vaultValue = formatTreatReserve(uiAmount, uiAmountString);

  return (
    <section className="section vault-stats" aria-label="Global Treat Vault stats">
      <Title size="large" color="app-teal">
        Global Treat Vault
      </Title>
      <div className="vault-stats__grid">
        {VAULT_STATS.map((stat) => {
          const Icon = stat.icon;
          const isVaultReserve = stat.label === 'Treat Vault Reserve';
          return (
            <Card key={stat.label} color={stat.accent} className="vault-stats__card" hoverable>
              <Icon size={28} className="vault-stats__icon" aria-hidden="true" />
              {isVaultReserve && !loaded ? (
                <div className="vault-stats__skeleton">
                  <Skeleton variant="text" active width="80%" />
                </div>
              ) : (
                <p className="vault-stats__value">{isVaultReserve ? vaultValue : stat.value}</p>
              )}
              <p className="vault-stats__label">{stat.label}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
