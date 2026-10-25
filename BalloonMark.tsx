/** Flat SVG balloon used for the logo and the no-WebGL fallback. */
export function BalloonMark({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 80 100" role="img" aria-label="Hot air balloon">
      <defs>
        <clipPath id="bm-env">
          <path d="M40 2C16 2 4 22 4 40c0 16 12 28 24 36h24c12-8 24-20 24-36C76 22 64 2 40 2Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#bm-env)">
        <rect width="80" height="80" fill="#ffc857" />
        <path d="M40 0c-14 14-20 40-8 78h16C60 40 54 14 40 0Z" fill="#ff8a3d" />
        <path d="M0 0h18c-8 20-10 50 6 78H0Z" fill="#fff1d0" />
        <path d="M80 0H62c8 20 10 50-6 78h24Z" fill="#fff1d0" />
      </g>
      <path d="M28 76 34 90M52 76 46 90" stroke="#d9cfb8" strokeWidth="1.5" />
      <rect x="31" y="88" width="18" height="10" rx="2" fill="#c8995a" />
    </svg>
  );
}
