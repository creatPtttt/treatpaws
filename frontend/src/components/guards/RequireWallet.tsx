import type { ReactNode } from 'react';
import { Button } from 'animal-island-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { GuardScreen } from './GuardScreen';

interface RequireWalletProps {
  children: ReactNode;
}

/** Route guard for /playpen: blocks the game hall behind a wallet-connect prompt. */
export function RequireWallet({ children }: RequireWalletProps) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (!connected) {
    return (
      <GuardScreen
        title="Connect your wallet"
        description="Connect a Solana Devnet wallet to enter the Playpen and start harvesting $TREAT."
      >
        <Button type="primary" size="large" onClick={() => setVisible(true)}>
          Connect Wallet
        </Button>
      </GuardScreen>
    );
  }

  return <>{children}</>;
}
