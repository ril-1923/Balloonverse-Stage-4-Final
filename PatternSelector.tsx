import { PATTERNS, type BalloonPattern } from '../../types/balloon';

function PatternThumb({ pattern, colors }: { pattern: BalloonPattern; colors: string[] }) {
  const cells: string[] = [];
  const cols = 8;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let fill = colors[0];
      if (pattern === 'vertical') fill = colors[c % 3];
      else if (pattern === 'horizontal') fill = colors[r % 3];
      else if (pattern === 'alternating') fill = colors[c % 2];
      else if (pattern === 'checkerboard') fill = colors[(c + r) % 2];
      else if (pattern === 'rainbow') fill = `hsl(${(c / cols) * 360} 85% 55%)`;
      cells.push(fill);
    }
  }
  return (
    <svg viewBox="0 0 32 20" className="pattern-thumb" aria-hidden>
      <clipPath id={`pt-${pattern}`}>
        <ellipse cx="16" cy="10" rx="14" ry="9" />
      </clipPath>
      <g clipPath={`url(#pt-${pattern})`}>
        {cells.map((f, i) => (
          <rect key={i} x={(i % cols) * 4} y={Math.floor(i / cols) * 5} width="4" height="5" fill={f} />
        ))}
      </g>
    </svg>
  );
}

interface Props {
  value: BalloonPattern;
  colors: string[];
  onChange: (p: BalloonPattern) => void;
}

export function PatternSelector({ value, colors, onChange }: Props) {
  return (
    <div className="option-grid option-grid--patterns" role="group" aria-label="Pattern">
      {PATTERNS.map((p) => (
        <button key={p.id} type="button" className={`option ${value === p.id ? 'is-active' : ''}`} aria-pressed={value === p.id} onClick={() => onChange(p.id)}>
          <PatternThumb pattern={p.id} colors={colors} />
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Plain text option buttons (materials, baskets, burner effects). */
export function OptionButtons<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="option-grid" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" className={`option option--text ${value === o.id ? 'is-active' : ''}`} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
