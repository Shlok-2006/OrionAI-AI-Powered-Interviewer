type Props = { value: number; size?: number; label?: string };

export function CircularScore({ value, size = 160, label = "Overall" }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.22 255)" />
            <stop offset="100%" stopColor="oklch(0.62 0.25 300)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" className="text-slate-200 dark:text-white/10" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#scoreGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{clamped}</span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export default CircularScore;