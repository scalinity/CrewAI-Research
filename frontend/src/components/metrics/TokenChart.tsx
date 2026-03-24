import { memo, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from "recharts";

// Recharts SVG rendering requires raw color values -- keep in sync with globals.css @theme
const ACCENT_HEX = "#f59e0b";
const TEXT_SECONDARY_HEX = "#8a8a8a";
const GRID_STROKE = "#2a2a2a";

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
    <div className="bg-bg-secondary rounded border border-border border-l-[3px] border-l-accent p-3">
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2 font-mono">Token Usage</div>
      <div className="h-[120px]" role="img" aria-label="Token usage over time chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ACCENT_HEX} stopOpacity={0.3} />
                <stop offset="95%" stopColor={ACCENT_HEX} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis
              dataKey="sec"
              tick={{ fontSize: 9, fill: TEXT_SECONDARY_HEX }}
              tickFormatter={(v: number) => `${v}s`}
              stroke={GRID_STROKE}
            />
            <YAxis
              tick={{ fontSize: 9, fill: TEXT_SECONDARY_HEX }}
              width={40}
              stroke={GRID_STROKE}
            />
            <Area
              type="monotone"
              dataKey="tokens"
              stroke={ACCENT_HEX}
              fill="url(#tokenGradient)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
