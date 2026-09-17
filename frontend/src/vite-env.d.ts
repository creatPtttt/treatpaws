/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Wallet address allowed to access the hidden /admin console. */
  readonly VITE_ADMIN_PUBKEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
