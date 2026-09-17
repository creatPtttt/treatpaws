import type { ReactNode } from 'react';
import { Card } from 'animal-island-ui';
import { PawLogo } from '../ui/PawLogo';

interface GuardScreenProps {
  title: string;
  description: string;
  children?: ReactNode;
}

/** Shared centered-card layout used by the wallet-connect and admin-unauthorized guards. */
export function GuardScreen({ title, description, children }: GuardScreenProps) {
  return (
    <div className="guard-screen">
      <Card className="guard-screen__card">
        <PawLogo size={40} />
        <h2 className="guard-screen__title">{title}</h2>
        <p className="guard-screen__description">{description}</p>
        {children}
      </Card>
    </div>
  );
}
