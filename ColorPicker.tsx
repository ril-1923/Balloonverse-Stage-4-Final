import { useState } from 'react';
import { SWATCHES } from '../../simulation/balloonPresets';

const SLOTS = ['Primary', 'Secondary', 'Accent'];

interface Props {
  colors: string[];
  onChange: (slot: number, hex: string) => void;
}

/** Three colour slots, 12 quick swatches and a free colour picker. */
export function ColorPicker({ colors, onChange }: Props) {
  const [slot, setSlot] = useState(0);
  return (
    <div className="studio-group">
      <div className="slot-tabs" role="tablist" aria-label="Colour slot">
        {SLOTS.map((name, i) => (
          <button key={name} type="button" role="tab" aria-selected={slot === i} className={`slot-tab ${slot === i ? 'is-active' : ''}`} onClick={() => setSlot(i)}>
            <span className="slot-dot" style={{ background: colors[i] }} aria-hidden />
            {name}
          </button>
        ))}
      </div>
      <div className="swatches" role="group" aria-label={`${SLOTS[slot]} colour swatches`}>
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`swatch ${colors[slot].toLowerCase() === hex ? 'is-active' : ''}`}
            style={{ background: hex }}
            aria-label={`${SLOTS[slot]} colour ${hex}`}
            aria-pressed={colors[slot].toLowerCase() === hex}
            onClick={() => onChange(slot, hex)}
          />
        ))}
      </div>
      <label className="custom-colour">
        <span>Custom colour</span>
        <input type="color" value={colors[slot]} onChange={(e) => onChange(slot, e.target.value)} aria-label={`Custom ${SLOTS[slot]} colour`} />
        <code>{colors[slot]}</code>
      </label>
    </div>
  );
}
