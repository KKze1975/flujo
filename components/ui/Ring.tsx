export default function Ring({
  pct,
  over,
  size = 52,
}: {
  pct: number;
  over: boolean;
  size?: number;
}) {
  const r = size * 0.44;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(pct, 100);
  const color = over ? "var(--neg)" : "var(--primary)";
  const cx = size / 2;

  return (
    <div className="fl-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * filled) / 100}
        />
      </svg>
      <span className="pct" style={over ? { color: "var(--neg)" } : undefined}>
        {pct}%
      </span>
    </div>
  );
}
