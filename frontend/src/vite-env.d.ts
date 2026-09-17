/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Wallet address allowed to access the hidden /admin console. */
  readonly VITE_ADMIN_PUBKEY?: string;
  /**
   * Dedicated Solana Devnet RPC HTTP endpoint (e.g. a Helius URL). Falls
   * back to the public `api.devnet.solana.com`, which rate-limits (429s)
   * batched calls — see `getSolanaRpcUrl` in `src/config/env.ts`.
   */
  readonly VITE_SOLANA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
