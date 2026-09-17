import { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { getSolanaRpcUrl, getSolanaWsUrl } from '../config/env';

// TreatPaws is only live on Solana Devnet during this testing phase.
export const SOLANA_CLUSTER = 'devnet' as const;

interface WalletContextProviderProps {
  children: ReactNode;
}

/**
 * Wraps the whole app with the three Solana wallet-adapter providers:
 * 1. ConnectionProvider — the RPC connection used to read balances / send txs.
 * 2. WalletProvider — tracks which wallet is connected (Phantom, etc.).
 * 3. WalletModalProvider — powers the "Select Wallet" popup used by
 *    <WalletMultiButton /> in the header.
 */
export const WalletContextProvider: FC<WalletContextProviderProps> = ({ children }) => {
  // Devnet RPC endpoint — reads `VITE_SOLANA_RPC_URL` (a dedicated Helius
  // Devnet URL in production) so the whole app avoids the public
  // `api.devnet.solana.com` endpoint's aggressive 429 rate-limiting. Swap
  // to a mainnet-beta URL once $TREAT is live on Pump.fun.
  const endpoint = useMemo(() => getSolanaRpcUrl(), []);
  // Helius (and most RPC providers) serve websocket subscriptions from the
  // exact same host/path/query as the HTTP endpoint, just on `wss://`
  // instead of `https://` — deriving it explicitly here keeps live
  // subscriptions (wallet balance, `useProgramEvents`) on the same
  // dedicated endpoint instead of silently falling back to a public one.
  const wsEndpoint = useMemo(() => getSolanaWsUrl(endpoint), [endpoint]);

  // Phantom is explicitly listed because it is TreatPaws' primary target
  // wallet. Any other wallet that implements the Wallet Standard (Solflare,
  // Backpack, etc.) is auto-detected by the adapter without being listed here.
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed', wsEndpoint }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
