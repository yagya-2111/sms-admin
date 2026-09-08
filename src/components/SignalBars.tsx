import { SignalZero } from "lucide-react";

interface Props {
  level?: number | null;
  networkType?: string | null;
}

export function SignalBars({ level, networkType }: Props) {
  const lvl = typeof level === "number" ? Math.max(0, Math.min(4, level)) : -1;
  const type = networkType || "—";

  if (lvl < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <SignalZero className="w-3.5 h-3.5" /> No signal
      </span>
    );
  }

  const color =
    lvl >= 3 ? "bg-green-500" : lvl === 2 ? "bg-amber-500" : "bg-red-500";
  const label =
    lvl >= 4 ? "Strong" :
    lvl === 3 ? "Good" :
    lvl === 2 ? "Normal" :
    lvl === 1 ? "Weak" : "Very weak";
  const textColor =
    lvl >= 3 ? "text-green-600" : lvl === 2 ? "text-amber-600" : "text-red-600";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-end gap-[2px] h-3.5" aria-label={`Signal ${lvl}/4`}>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-sm ${i <= lvl ? color : "bg-muted"}`}
            style={{ height: `${i * 3 + 2}px` }}
          />
        ))}
      </span>
      <span className={`text-xs ${textColor}`}>{type} · {label}</span>
    </span>
  );
}
