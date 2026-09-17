import { Button, type ButtonSize } from 'animal-island-ui';
import { Twitter } from 'lucide-react';
import { shareToX } from '../../utils/share';

interface ShareOnXButtonProps {
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

/** Small "Share on X" button — opens a pre-filled tweet-intent tab with TreatPaws' viral share copy. */
export function ShareOnXButton({ size = 'small', block, className }: ShareOnXButtonProps) {
  return (
    <Button
      type="default"
      size={size}
      block={block}
      icon={<Twitter size={15} />}
      className={className}
      onClick={shareToX}
    >
      Share on X
    </Button>
  );
}
