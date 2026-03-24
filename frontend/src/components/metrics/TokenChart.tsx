import { memo, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

// Recharts SVG rendering requires raw color values -- keep in sync with globals.css @theme
const ACCENT_BLUE_HEX = "#38BDF8";
const TEXT_MUTED_HEX = "#94A3B8";
const GRID_STROKE = "rgba(255,255,255,0.06)";

export const TokenChart = memo(function TokenChart({ data }: { data: { time: number; tokens: number }[] }) {
  const chartData = useMemo(() => {
    if (data.length < 2) return null;
    const startTime = data[0].time;
    return data.map((d) => ({
      sec: Math.round(d.time - startTime),
      tokens: d.tokens,
    }));
  }, [data]);

  if (!chartData) return null;

  return (
    <div className="bg-bg-surface rounded-lg border border-border p-3">
      <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2 font-mono">Token Usage</div>
      <div className="h-[120px]" role="img" aria-label="Token usage over time chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT_BLUE_HEX} stopOpacity={0.3} />
                <stop offset="95%" stopColor={ACCENT_BLUE_HEX} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="sec"
              tick={{ fontSize: 9, fill: TEXT_MUTED_HEX }}
              tickFormatter={(v: number) => `${v}s`}
              stroke={GRID_STROKE}
            />
            <YAxis
              tick={{ fontSize: 9, fill: TEXT_MUTED_HEX }}
              width={40}
              stroke={GRID_STROKE}
            />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke={ACCENT_BLUE_HEX}
              fill="url(#tokenGradient)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
