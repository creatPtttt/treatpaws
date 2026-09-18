import { Button, Card, Modal, Tag } from 'animal-island-ui';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { explorerUrl } from '../../data/chain';
import { shortenAddress } from '../../wallet/format';

export interface ExplorerTarget {
  /** Human label shown in the badge, e.g. "Program" or "$TREAT Mint". */
  kind: string;
  address: string;
}

interface ExplorerVerifyModalProps {
  target: ExplorerTarget | null;
  onClose: () => void;
}

/** Confirms that the visitor is about to leave the island for Solana Explorer (Devnet). */
export function ExplorerVerifyModal({ target, onClose }: ExplorerVerifyModalProps) {
  const open = target !== null;

  const handleProceed = () => {
    if (!target) return;
    window.open(explorerUrl(target.address), '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Solana Devnet Verification"
      onClose={onClose}
      typewriter={false}
      width={520}
      footer={
        <>
          <Button onClick={onClose}>Cancel / Stay on Island</Button>
          <Button type="primary" icon={<ExternalLink size={16} />} onClick={handleProceed}>
            Proceed to Explorer
          </Button>
        </>
      }
    >
      <div className="explorer-modal__body">
        <p className="explorer-modal__copy">
          You are about to view this contract on <strong>Solana Devnet</strong>! This public testnet
          deployment allows the community to verify our on-chain game mechanics, open-source Anchor
          code, and security.
        </p>

        {target && (
          <div className="explorer-modal__target">
            <Tag color="app-teal" variant="soft">
              {target.kind}
            </Tag>
            <Tag color="default" variant="soft">
              {shortenAddress(target.address, 8)}
            </Tag>
          </div>
        )}

        <Card className="explorer-modal__notice">
          <ShieldCheck size={22} className="explorer-modal__notice-icon" aria-hidden="true" />
          <p className="explorer-modal__notice-text">
            Notice: Once $TREAT officially launches on Pump.fun, these links will automatically
            update to the Solana Mainnet contract!
          </p>
        </Card>
      </div>
    </Modal>
  );
}
