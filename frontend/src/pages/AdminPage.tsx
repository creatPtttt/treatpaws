import { Title } from 'animal-island-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useProgram } from '../anchor/useProgram';
import { useGameConfig } from '../hooks/useGameConfig';
import { useMintDecimals } from '../hooks/useMintDecimals';
import { useTransactionRunner } from '../hooks/useTransactionRunner';
import { useVaultBalance } from '../hooks/useVaultBalance';
import { InitializeGameCard } from '../components/admin/InitializeGameCard';
import { DepositVaultCard } from '../components/admin/DepositVaultCard';
import { WithdrawVaultCard } from '../components/admin/WithdrawVaultCard';
import { UpdateConfigCard } from '../components/admin/UpdateConfigCard';

/**
 * Hidden management console ("/admin"). The route itself is gated by
 * `RequireAdmin` (see App.tsx) — by the time this renders, the connected
 * wallet has already been confirmed to match VITE_ADMIN_PUBKEY.
 */
export function AdminPage() {
  const program = useProgram();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { gameConfig, notInitialized, loading, refetch } = useGameConfig(program);
  const { decimals, loaded: decimalsLoaded } = useMintDecimals(connection);
  const { uiAmount: vaultUiAmount, uiAmountString: vaultUiAmountString, loaded: vaultLoaded, refetch: refetchVault } =
    useVaultBalance(connection);
  const { pendingKey, run } = useTransactionRunner();

  // Refresh both GameConfig and the Vault token balance after any admin tx.
  const handleSuccess = () => {
    void refetch();
    void refetchVault();
  };

  return (
    <section className="section admin-page">
      <Title size="large" color="app-orange">
        Admin Console
      </Title>
      <p className="admin-page__intro">
        Hidden management tools — this page is not linked from any navigation menu.
      </p>

      <div className="admin-page__cards">
        <InitializeGameCard
          program={program}
          publicKey={publicKey}
          notInitialized={notInitialized}
          checking={loading}
          pendingKey={pendingKey}
          run={run}
          onSuccess={handleSuccess}
        />

        <DepositVaultCard
          program={program}
          publicKey={publicKey}
          decimals={decimals}
          decimalsLoaded={decimalsLoaded}
          pendingKey={pendingKey}
          run={run}
          onSuccess={handleSuccess}
        />

        <WithdrawVaultCard
          program={program}
          publicKey={publicKey}
          decimals={decimals}
          decimalsLoaded={decimalsLoaded}
          vaultUiAmount={vaultUiAmount}
          vaultUiAmountString={vaultUiAmountString}
          vaultLoaded={vaultLoaded}
          pendingKey={pendingKey}
          run={run}
          onSuccess={handleSuccess}
        />

        <UpdateConfigCard
          program={program}
          publicKey={publicKey}
          gameConfig={gameConfig}
          pendingKey={pendingKey}
          run={run}
          onSuccess={handleSuccess}
        />
      </div>
    </section>
  );
}
