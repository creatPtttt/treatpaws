import { Button, Modal } from 'animal-island-ui';

interface FeedConfirmModalProps {
  open: boolean;
  petName: string;
  cost: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/** Confirms spending `feed_cost` $TREAT to give a pet a 24h Snack Boost. */
export function FeedConfirmModal({ open, petName, cost, loading, onClose, onConfirm }: FeedConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={`Feed ${petName}?`}
      onClose={onClose}
      typewriter={false}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" loading={loading} onClick={onConfirm}>
            Confirm Feed
          </Button>
        </>
      }
    >
      This spends <strong>{cost} $TREAT</strong> from your wallet and grants a 24-hour Snack Boost
      (raised production rate) for this pet.
    </Modal>
  );
}
