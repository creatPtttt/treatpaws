import { Cursor } from 'animal-island-ui';
import { Route, Routes } from 'react-router-dom';
import { SiteHeader } from './components/layout/SiteHeader';
import { SiteFooter } from './components/layout/SiteFooter';
import { RequireWallet } from './components/guards/RequireWallet';
import { RequireAdmin } from './components/guards/RequireAdmin';
import { LandingPage } from './pages/LandingPage';
import { PlaypenPage } from './pages/PlaypenPage';
import { AdminPage } from './pages/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * TreatPaws app shell: header + footer stay mounted across every route,
 * only the middle `<main>` content switches. `<Cursor>` wraps everything so
 * the whole app gets animal-island-ui's cozy game-style finger cursor.
 *
 * Routes:
 * - "/"        marketing landing page (public)
 * - "/playpen" the live game hall (behind RequireWallet)
 * - "/admin"   hidden management console (behind RequireAdmin) — intentionally
 *              not linked from any nav menu; reachable only by typing the URL.
 */
export default function App() {
  return (
    <Cursor>
      <div className="page">
        <SiteHeader />
        <main>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/playpen"
              element={
                <RequireWallet>
                  <PlaypenPage />
                </RequireWallet>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <SiteFooter />
      </div>
    </Cursor>
  );
}
