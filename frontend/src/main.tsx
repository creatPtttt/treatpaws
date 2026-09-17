import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// MANDATORY: animal-island-ui global stylesheet. Must be imported once, at
// the app entry, before any component renders — otherwise everything is
// unstyled (see the skill's hard rule #2).
import 'animal-island-ui/style';

// Official Solana wallet-adapter UI styles (Connect button + wallet modal).
import '@solana/wallet-adapter-react-ui/styles.css';

// TreatPaws page layout / theme overrides — imported last so it can safely
// build on top of the two stylesheets above.
import './index.css';

import App from './App';
import { WalletContextProvider } from './wallet/WalletContextProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletContextProvider>
        <App />
      </WalletContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
