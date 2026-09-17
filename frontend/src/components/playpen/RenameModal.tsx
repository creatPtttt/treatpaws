import { useEffect, useState } from 'react';
import { Button, Input, Modal } from 'animal-island-ui';

const MAX_NAME_LENGTH = 32;

interface RenameModalProps {
  open: boolean;
  currentName: string;
  cost: number;
  loading: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

/** Input modal for renaming a pet, sinking `rename_cost` $TREAT. */
export function RenameModal({ open, currentName, cost, loading, onClose, onConfirm }: RenameModalProps) {
  const [name, setName] = useState(currentName);

  // Reset the draft name every time the modal is (re)opened.
  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0 && trimmedName.length <= MAX_NAME_LENGTH;

  return (
    <Modal
      open={open}
      title="Rename this pet"
      onClose={onClose}
      typewriter={false}
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" loading={loading} disabled={!isValid} onClick={() => onConfirm(trimmedName)}>
            Confirm Rename
          </Button>
        </>
      }
    >
      <p className="rename-modal__hint">
        Costs <strong>{cost} $TREAT</strong>. Max {MAX_NAME_LENGTH} characters.
      </p>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={MAX_NAME_LENGTH}
        allowClear
        placeholder="New pet name"
        autoFocus
      />
    </Modal>
  );
}
