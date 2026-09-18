import { useState, type MouseEvent } from 'react';
import { Footer } from 'animal-island-ui';
import { Twitter, Send, MessageCircle } from 'lucide-react';
import { PROGRAM_ID, TREAT_MINT, explorerUrl } from '../../data/chain';
import { shortenAddress } from '../../wallet/format';
import { ExplorerVerifyModal, type ExplorerTarget } from './ExplorerVerifyModal';

// Community links — every icon currently points at the TreatPaws X account.
const SOCIAL_LINKS = [
  { icon: Twitter, label: 'X (Twitter)', href: 'https://x.com/treatpaws' },
  { icon: Send, label: 'Telegram', href: 'https://x.com/treatpaws' },
  { icon: MessageCircle, label: 'Discord', href: 'https://x.com/treatpaws' },
];

/** Site footer: community links, on-chain contract/mint links, then the copyright bar. */
export function SiteFooter() {
  const [explorerTarget, setExplorerTarget] = useState<ExplorerTarget | null>(null);

  const openExplorerModal = (event: MouseEvent<HTMLAnchorElement>, target: ExplorerTarget) => {
    event.preventDefault();
    setExplorerTarget(target);
  };

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__socials">
          {SOCIAL_LINKS.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                className="site-footer__social-link"
                aria-label={social.label}
              >
                <Icon size={20} aria-hidden="true" />
              </a>
            );
          })}
        </div>

        <div className="site-footer__chain-links">
          <a
            href={explorerUrl(PROGRAM_ID)}
            onClick={(event) => openExplorerModal(event, { kind: 'Program', address: PROGRAM_ID })}
          >
            Program: {shortenAddress(PROGRAM_ID, 6)}
          </a>
          <span className="site-footer__divider-dot" aria-hidden="true">
            •
          </span>
          <a
            href={explorerUrl(TREAT_MINT)}
            onClick={(event) => openExplorerModal(event, { kind: '$TREAT Mint', address: TREAT_MINT })}
          >
            $TREAT Mint: {shortenAddress(TREAT_MINT, 6)}
          </a>
        </div>

        <p className="site-footer__tagline">
          Cozy pixel companions baking sweet treats on Solana · Built for pure fun.
        </p>
      </div>

      {/* animal-island-ui's own copyright bar component */}
      <Footer text="TreatPaws. Built on Solana Devnet." />

      <ExplorerVerifyModal target={explorerTarget} onClose={() => setExplorerTarget(null)} />
    </footer>
  );
}
