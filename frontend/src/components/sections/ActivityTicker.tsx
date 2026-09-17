import { ACTIVITY_FEED } from '../../data/activity';

/**
 * Soft scrolling horizontal banner of "live" island activity. The feed array
 * is rendered twice back-to-back and slid left by exactly one copy's width
 * via CSS animation, so the loop is seamless (no visible jump/reset).
 */
export function ActivityTicker() {
  return (
    <div className="ticker" role="status" aria-label="Live island activity">
      <div className="ticker__track">
        {[...ACTIVITY_FEED, ...ACTIVITY_FEED].map((item, index) => {
          const Icon = item.icon;
          return (
            <span className="ticker__item" key={index} aria-hidden={index >= ACTIVITY_FEED.length}>
              <Icon size={16} className="ticker__icon" />
              {item.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
