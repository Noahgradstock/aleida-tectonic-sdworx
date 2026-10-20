// The mascot as it appears in the web app: the same blob in its SD Worx cap that lives on the desktop.
// mood: listening (green, gently bobbing), thinking (blue), warning (amber).

const BODY = { listening: "#3DBE9A", thinking: "#5AA6E8", warning: "#F2A33A" } as const;

export default function Blob({ size = 64, mood = "listening" }: { size?: number; mood?: keyof typeof BODY }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-label="Jef, the Company brain mascot" className="shrink-0">
      <defs>
        <linearGradient id="blob-crown" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f4677" />
          <stop offset="100%" stopColor="#131f3b" />
        </linearGradient>
        <radialGradient id="blob-shine" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="150" rx="44" ry="6" fill="#000" opacity=".08" />
      <g className="blob-bob">
        <path d="M80 40 C118 40 140 66 138 98 C136 128 112 144 80 144 C48 144 22 128 22 98 C20 66 42 40 80 40 Z" fill={BODY[mood]} style={{ transition: "fill .4s" }} />
        <path d="M80 40 C118 40 140 66 138 98 C136 128 112 144 80 144 C48 144 22 128 22 98 C20 66 42 40 80 40 Z" fill="url(#blob-shine)" />
        <g className="blob-eyes">
          <ellipse cx="62" cy="101" rx="7" ry="10" fill="#1f2a3a" />
          <ellipse cx="98" cy="101" rx="7" ry="10" fill="#1f2a3a" />
        </g>
        <circle cx="64.5" cy="97" r="2.4" fill="#fff" />
        <circle cx="100.5" cy="97" r="2.4" fill="#fff" />
        <ellipse cx="48" cy="116" rx="7" ry="4" fill="#ff8a8a" opacity=".35" />
        <ellipse cx="112" cy="116" rx="7" ry="4" fill="#ff8a8a" opacity=".35" />
        <path d="M70 120 Q80 127 90 120" fill="none" stroke="#1f2a3a" strokeWidth="3" strokeLinecap="round" />
        <path d="M28 66 C28 31 53 13 80 13 C107 13 132 31 132 66 C112 61 48 61 28 66 Z" fill="url(#blob-crown)" />
        <path d="M36 63 C58 58 102 58 124 63 C131 67 129 79 118 82 C100 88 60 88 42 82 C31 79 29 67 36 63 Z" fill="#1a2a4c" />
        <rect x="71" y="34" width="2.6" height="10" rx="1.2" fill="#7ED957" transform="skewX(-22) translate(14 0)" />
        <rect x="75.6" y="34" width="2.6" height="10" rx="1.2" fill="#4FB3F6" transform="skewX(-22) translate(14 0)" />
      </g>
    </svg>
  );
}
