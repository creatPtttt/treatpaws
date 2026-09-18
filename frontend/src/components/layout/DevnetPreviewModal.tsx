import { Button, Card, Modal } from 'animal-island-ui';
import { Gift, Leaf } from 'lucide-react';

interface DevnetPreviewModalProps {
  open: boolean;
  onClose: () => void;
}

const FAUCET_URL = 'https://faucet.solana.com';

/** Explains the Devnet preview and points trainers at free test SOL. */
export function DevnetPreviewModal({ open, onClose }: DevnetPreviewModalProps) {
  return (
    <Modal
      open={open}
      title={
        <span className="devnet-modal__title">
          <span className="devnet-modal__title-badge" aria-hidden="true">
            <Leaf size={20} />
          </span>
          Devnet Community Preview
        </span>
      }
      onClose={onClose}
      typewriter={false}
      width={480}
      footer={
        <a href={FAUCET_URL} target="_blank" rel="noreferrer noopener" className="devnet-modal__faucet-link">
          <Button type="primary">Get Free Devnet SOL</Button>
        </a>
      }
    >
      <div className="devnet-modal__body">
        <p className="devnet-modal__copy">
          TreatPaws is currently welcoming trainers on Solana Devnet for community testing! You can
          grab free test SOL from the official faucet to adopt pets and bake treats.
        </p>
        <Card className="devnet-modal__roadmap">
          <Gift size={22} className="devnet-modal__roadmap-icon" aria-hidden="true" />
          <p className="devnet-modal__roadmap-text">
            Mainnet Launch: TreatPaws will officially migrate to Solana Mainnet within 24 hours of
            our $TREAT token launch on Pump.fun!
          </p>
        </Card>
      </div>
    </Modal>
  );
}
