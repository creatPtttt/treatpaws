import { Button } from 'animal-island-ui';
import { Link } from 'react-router-dom';

/** Simple 404 for any unmatched route. */
export function NotFoundPage() {
  return (
    <div className="not-found">
      <h1 className="not-found__code">404</h1>
      <p className="not-found__message">This corner of the island hasn't been built yet.</p>
      <Link to="/">
        <Button type="primary">Back to Home</Button>
      </Link>
    </div>
  );
}
