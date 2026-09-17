import { Button } from 'animal-island-ui';
import { Link } from 'react-router-dom';
import { GuardScreen } from '../guards/GuardScreen';

/** Shown on /playpen when GameConfig / the Pet PDAs don't exist on-chain yet. */
export function NotInitializedNotice() {
  return (
    <GuardScreen
      title="The island is still under construction"
      description="Game has not been initialized on-chain. Please visit /admin to initialize."
    >
      <Link to="/admin">
        <Button type="primary">Go to /admin</Button>
      </Link>
    </GuardScreen>
  );
}
