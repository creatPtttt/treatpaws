import { useCallback } from 'react';
import { Button, Card, Divider, Modal, Tag } from 'animal-island-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Coins, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PetSprite } from '../ui/PetSprite';
import { getCreature } from '../../data/creatures';
import { shortenAddress } from '../../wallet/format';
import type { TakeoverDetails } from '../../utils/takeover';

interface TakeoverCelebrationModalProps {
  /** null = nothing to celebrate right now, modal stays closed. */
  details: TakeoverDetails | null;
  onClose: () => void;
}

function lamportsToSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

/**
 * The on-chain default name is already `Pet #{id}` (see lib.rs
 * `initialize_game`), so blindly appending "#{id}" again produced the
 * "Pet #3 #3" bug. Only append the id tag when the (possibly custom,
 * renamed) pet name doesn't already carry it.
 */
function formatPetDisplayName(petName: string, petId: number): string {
  const idTag = `#${petId}`;
  return petName.includes(idTag) ? petName : `${petName} (ID ${idTag})`;
}

/**
 * The "your pet just got bought out" celebration — a full `animal-island-ui`
 * `<Modal>` (replacing a plain toast) with the pet's own bouncing animated
 * sprite, a financial breakdown card, a golden profit stamp, and a
 * confetti burst on dismissal. Fires from BOTH the
 * live WebSocket handler (`useProgramEvents`) and the offline "welcome
 * back" diff (`useOfflineTakeoverDetection`) — this component doesn't
 * care which.
 */
export function TakeoverCelebrationModal({ details, onClose }: TakeoverCelebrationModalProps) {
  const handleCollect = useCallback(() => {
    void confetti({
      particleCount: 140,
      spread: 80,
      startVelocity: 45,
      origin: { y: 0.6 },
      // Sticks to the site's own brand palette rather than confetti's
      // default rainbow, so the burst still feels on-theme.
      colors: ['#19c8b9', '#f5c31c', '#8ac68a', '#e59266', '#f8a6b2'],
    });
    onClose();
  }, [onClose]);

  if (!details) return null;

  return (
    <Modal
      open
      title={
        <span className="takeover-modal__title">
          <span className="takeover-modal__title-badge" aria-hidden="true">
            <PartyPopper size={20} />
          </span>
          Cha-Ching! Your Pet Was Bought Out!
        </span>
      }
      onClose={onClose}
      footer={null}
      width={420}
      typewriter={false}
      className="takeover-modal"
    >
      <div className="takeover-modal__body">
        {/* A visible dashed rule right under the title so the banner and the
            receipt content below it read as two clearly separate zones. */}
        <Divider type="dashed-brown" className="takeover-modal__header-divider" />

        {/* Generous headroom + `overflow: visible` on every layer here (see
            index.css) so the bounce never clips the sprite's ears. */}
        <div className="takeover-modal__sprite-stage">
          <div className="takeover-modal__sprite-wrap">
            <PetSprite creature={getCreature(details.petId)} size={92} />
          </div>
        </div>

        <Card color="app-yellow" className="takeover-modal__breakdown">
          <p className="takeover-modal__pet-line">{formatPetDisplayName(details.petName, details.petId)}</p>

          <div className="takeover-modal__row">
            <span>New Buyer</span>
            <span title={details.buyerAddress}>{shortenAddress(details.buyerAddress)}</span>
          </div>

          <Divider type="dashed-brown" className="takeover-modal__breakdown-divider" />

          <div className="takeover-modal__row">
            <span>Total SOL Credited</span>
            <span>{lamportsToSol(details.creditedLamports)} SOL</span>
          </div>

          <div className="takeover-modal__profit-stamp">
            <Tag color="app-yellow" variant="solid" size="large" className="takeover-modal__profit-tag">
              <Coins size={18} className="takeover-modal__profit-icon" aria-hidden="true" />
              +{lamportsToSol(details.profitLamports)} SOL Net Profit!
            </Tag>
          </div>
        </Card>

        <p className="takeover-modal__treat-note">
          All accrued $TREAT up to the buyout moment was auto-transferred to your wallet.
        </p>

        <Button
          type="primary"
          size="large"
          block
          onClick={handleCollect}
          className="takeover-modal__collect-button"
        >
          Awesome! Collect Profits
        </Button>
      </div>
    </Modal>
  );
}
