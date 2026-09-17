import type { CSSProperties } from 'react';

interface DaySliderProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  'aria-label'?: string;
}

/**
 * animal-island-ui's component catalog has no Slider/Range control, so this
 * is a small custom range input restyled to match the library's look: a
 * cream pill track, a teal fill (using the same primary color as Button),
 * and a raised circular thumb with the same "pressed 3D" shadow language
 * used by primary buttons. Kept in its own file so it's easy to replace if
 * a real Slider component is ever added to the package.
 */
export function DaySlider({ value, min = 1, max = 30, onChange, ...aria }: DaySliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      className="day-slider"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ '--day-slider-fill': `${percent}%` } as CSSProperties}
      aria-valuetext={`${value} days`}
      {...aria}
    />
  );
}
