import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

/**
 * Powers the "Enter TreatPaws" / "Adopt Genesis Pet" call-to-actions: if a
 * wallet is already connected, navigate straight to /playpen; otherwise
 * open the wallet-select modal and navigate automatically the moment a
 * connection succeeds (so the user never has to click twice).
 */
export function useEnterGame() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const navigate = useNavigate();
  const pendingRef = useRef(false);

  useEffect(() => {
    if (connected && pendingRef.current) {
      pendingRef.current = false;
      navigate('/playpen');
    }
  }, [connected, navigate]);

  return useCallback(() => {
    if (connected) {
      navigate('/playpen');
    } else {
      pendingRef.current = true;
      setVisible(true);
    }
  }, [connected, navigate, setVisible]);
}
