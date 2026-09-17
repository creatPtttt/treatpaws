import type { ReactNode } from 'react';
import { Button } from 'animal-island-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { getAdminPubkey } from '../../config/env';
import { GuardScreen } from './GuardScreen';

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * Route guard for the hidden /admin console:
 * 1. No wallet connected → prompt to connect.
 * 2. VITE_ADMIN_PUBKEY unset → explain how to configure it.
 * 3. Connected wallet != admin → Unauthorized.
 * 4. Otherwise render the admin tools.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const adminPubkey = getAdminPubkey();

  if (!connected || !publicKey) {
    return (
      <GuardScreen
        title="Connect your wallet"
        description="Connect the game admin's wallet to open the management console."
      >
        <Button type="primary" size="large" onClick={() => setVisible(true)}>
          Connect Wallet
        </Button>
      </GuardScreen>
    );
  }

  if (!adminPubkey) {
    return (
      <GuardScreen
        title="Admin wallet not configured"
        description="Set VITE_ADMIN_PUBKEY in frontend/.env (see .env.example) to the wallet address that should control this console, then restart the dev server."
      />
    );
  }

  if (publicKey.toBase58() !== adminPubkey) {
    return (
      <GuardScreen
        title="Unauthorized"
        description="The connected wallet is not the configured game admin. Switch to the admin wallet in Phantom and reload."
      />
    );
  }

  return <>{children}</>;
}
