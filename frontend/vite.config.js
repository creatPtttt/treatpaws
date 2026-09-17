import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
// Vite config for the TreatPaws landing page.
export default defineConfig({
    plugins: [
        react(),
        // @solana/web3.js and the wallet-adapter packages assume Node globals
        // (Buffer, process, global) that do not exist in the browser. This
        // plugin injects lightweight polyfills so wallet connect / balance
        // fetching works without extra manual setup.
        nodePolyfills({
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    server: {
        port: 5173,
        open: true,
    },
});
