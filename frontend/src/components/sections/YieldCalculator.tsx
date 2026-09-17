import { useMemo, useState } from 'react';
import { Card, Title, Switch } from 'animal-island-ui';
import { Sparkles } from 'lucide-react';
import { DaySlider } from '../ui/DaySlider';
import { BASE_REWARD_PER_10_MIN, BOOST_MULTIPLIER, FEED_COST_TREAT } from '../../data/chain';

const INTERVALS_PER_DAY = (24 * 60) / 10; // 144 ten-minute windows in a day
const DAILY_BASE_YIELD = BASE_REWARD_PER_10_MIN * INTERVALS_PER_DAY; // 14,400 $TREAT/day unboosted

/** Interactive projected-earnings calculator: days-of-holding slider + boost toggle. */
export function YieldCalculator() {
  const [days, setDays] = useState(7);
  const [boosted, setBoosted] = useState(false);

  const { gross, feedCost, net } = useMemo(() => {
    const dailyYield = boosted ? DAILY_BASE_YIELD * BOOST_MULTIPLIER : DAILY_BASE_YIELD;
    const grossTotal = Math.round(dailyYield * days);
    // Assumes re-feeding once every 24h to keep the Snack Boost continuously active.
    const feedTotal = boosted ? FEED_COST_TREAT * days : 0;
    return { gross: grossTotal, feedCost: feedTotal, net: grossTotal - feedTotal };
  }, [days, boosted]);

  return (
    <section className="section" id="calculator" aria-label="$TREAT Yield Calculator">
      <Title size="large" color="app-yellow">
        $TREAT Yield Calculator
      </Title>
      <Card className="calculator__card">
        <div className="calculator__controls">
          <label className="calculator__control">
            <span className="calculator__control-label">
              Days of Holding — <strong>{days}</strong>
            </span>
            <DaySlider value={days} onChange={setDays} min={1} max={30} aria-label="Days of holding" />
            <div className="calculator__slider-scale">
              <span>1 day</span>
              <span>30 days</span>
            </div>
          </label>

          <label className="calculator__control calculator__control--row">
            <span className="calculator__control-label">
              <Sparkles size={16} aria-hidden="true" /> Feed 500 $TREAT for 24h Snack Boost (+20% output)
            </span>
            <Switch checked={boosted} onChange={setBoosted} />
          </label>
        </div>

        <div className="calculator__output">
          <div className="calculator__output-row calculator__output-row--main">
            <span>Projected $TREAT earned</span>
            <strong>{gross.toLocaleString()}</strong>
          </div>
          {boosted && (
            <div className="calculator__output-row">
              <span>Snack Boost feeding cost ({days} feeds × 500)</span>
              <strong>-{feedCost.toLocaleString()}</strong>
            </div>
          )}
          <div className="calculator__output-row calculator__output-row--net">
            <span>Net $TREAT after feeding</span>
            <strong>{net.toLocaleString()}</strong>
          </div>
        </div>
      </Card>
    </section>
  );
}
