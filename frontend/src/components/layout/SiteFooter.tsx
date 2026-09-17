import { Footer } from 'animal-island-ui';
import { Twitter, Send, MessageCircle } from 'lucide-react';
import { PROGRAM_ID, TREAT_MINT, explorerUrl } from '../../data/chain';
import { shortenAddress } from '../../wallet/format';

// Placeholder community links — swap hrefs once real accounts/servers exist.
const SOCIAL_LINKS = [
  { icon: Twitter, label: 'X (Twitter)', href: 'https://x.com/treatpaws' },
  { icon: Send, label: 'Telegram', href: 'https://t.me/treatpaws' },
  { icon: MessageCircle, label: 'Discord', href: 'https://discord.gg/treatpaws' },
];

/** Site footer: community links, on-chain contract/mint links, then the copyright bar. */
export function SiteFooter() {
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
          <a href={explorerUrl(PROGRAM_ID)} target="_blank" rel="noreferrer noopener">
            Program: {shortenAddress(PROGRAM_ID, 6)}
          </a>
          <span className="site-footer__divider-dot" aria-hidden="true">
            •
          </span>
          <a href={explorerUrl(TREAT_MINT)} target="_blank" rel="noreferrer noopener">
            $TREAT Mint: {shortenAddress(TREAT_MINT, 6)}
          </a>
        </div>
      </div>

      {/* animal-island-ui's own copyright bar component */}
      <Footer text="TreatPaws. Built on Solana Devnet." />
    </footer>
  );
}
