import { useState } from 'react';
import { Button, Tag } from 'animal-island-ui';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Leaf, Menu, X } from 'lucide-react';
import { PawLogo } from '../ui/PawLogo';
import { DevnetPreviewModal } from './DevnetPreviewModal';
import { useWalletBalance } from '../../wallet/useWalletBalance';
import { useEnterGame } from '../../hooks/useEnterGame';
import { formatSol, shortenAddress } from '../../wallet/format';

// Anchor-link targets for the center nav — only rendered on the landing
// page ("/"), since these ids only exist there.
const NAV_LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pets', label: 'Genesis Pets' },
  { href: '#calculator', label: 'Calculator' },
  { href: '#faq', label: 'FAQ' },
];

/**
 * Sticky top navigation, shared across every route. On the landing page it
 * shows the marketing anchor-nav + an "Enter TreatPaws" CTA; on any other
 * route (Playpen, Admin) it collapses to just a "Home" link, since those
 * anchors don't exist there. /admin is intentionally never linked here —
 * it's a hidden console reached only by typing the URL.
 */
export function SiteHeader() {
  const { connected, publicKey } = useWallet();
  const balance = useWalletBalance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [devnetOpen, setDevnetOpen] = useState(false);
  const location = useLocation();
  const enterGame = useEnterGame();
  const isLanding = location.pathname === '/';

  return (
    <header className="site-header">
      <div className="site-header__inner">
        {/* Brand: paw+cookie logomark + wordmark, always routes home */}
        <Link to="/" className="site-header__brand" aria-label="TreatPaws home">
          <PawLogo size={34} />
          <span className="site-header__brand-name">TreatPaws</span>
        </Link>

        {/* Center anchor nav — landing page only */}
        {isLanding && (
          <nav className="site-header__nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="site-header__nav-link">
                {link.label}
              </a>
            ))}
          </nav>
        )}

        <div className="site-header__actions">
          {/* Clickable Devnet pill — opens a cozy preview modal (not a live-SOL warning toast). */}
          <span className="site-header__devnet-wrap">
            <Tag
              color="app-teal"
              variant="soft"
              className="site-header__devnet-tag"
              onClick={() => setDevnetOpen(true)}
            >
              <Leaf size={14} aria-hidden="true" />
              Devnet
            </Tag>
          </span>

          {/* Official Solana wallet-adapter connect button, restyled via CSS
              (see .wallet-adapter-button overrides in index.css) to match the
              cozy pill + 3D shadow language of the rest of the page. */}
          <WalletMultiButton />

          {/* Once connected, surface the shortened address + live SOL balance */}
          {connected && publicKey && (
            <span className="site-header__balance" title={publicKey.toBase58()}>
              {shortenAddress(publicKey.toBase58())} · {formatSol(balance)}
            </span>
          )}

          {isLanding ? (
            <Button type="primary" onClick={enterGame} className="site-header__cta">
              Enter TreatPaws
            </Button>
          ) : (
            <Link to="/" className="site-header__cta">
              <Button>Home</Button>
            </Link>
          )}

          {/* Mobile menu toggle — only shown/relevant on the landing page */}
          {isLanding && (
            <button
              type="button"
              className="site-header__menu-toggle"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown panel, mirrors the desktop nav links */}
      {isLanding && menuOpen && (
        <nav className="site-header__mobile-nav" aria-label="Primary mobile">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="site-header__nav-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}

      <DevnetPreviewModal open={devnetOpen} onClose={() => setDevnetOpen(false)} />
    </header>
  );
}
