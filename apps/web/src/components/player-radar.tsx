import {
  radarAxisAngle,
  radarGridCircles,
  radarPoint,
  radarPolygonPoints,
} from '@/lib/radar';

export type RadarSeries = {
  name: string;
  color: string;
  percents: number[];
};

type PlayerRadarProps = {
  axes: Array<{ axis: string; label: string }>;
  series: RadarSeries[];
};

export function PlayerRadar({ axes, series }: PlayerRadarProps) {
  if (!axes || axes.length < 3) {
    return null;
  }

  const size = 420;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 132;
  const total = axes.length;
  const rings = radarGridCircles(radius, 4);
  const plotted = series.filter((item) => item.percents.length === total);

  return (
    <div className="player-radar-container">
      {plotted.length > 0 ? (
        <div className="radar-legend">
          {plotted.map((item) => (
            <div className="radar-legend-item" key={item.name}>
              <span
                className="radar-legend-dot"
                style={{ backgroundColor: item.color, opacity: 0.7 }}
              />
              <span className="radar-legend-name">{item.name}</span>
            </div>
          ))}
        </div>
      ) : null}

      <svg
        aria-label={
          plotted.length > 1
            ? `Radar comparison of ${plotted.map((item) => item.name).join(', ')}`
            : 'Player style radar'
        }
        className="player-radar-svg"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <radialGradient cx="50%" cy="50%" id="radar-wash" r="50%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="72%" stopColor="var(--surface)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} fill="url(#radar-wash)" r={radius} />

        <g className="radar-grid-rings">
          {rings.map((ringRadius) => (
            <circle
              className="radar-grid-circle"
              cx={cx}
              cy={cy}
              key={ringRadius}
              r={ringRadius}
            />
          ))}
        </g>

        <g className="radar-spokes">
          {axes.map((_, idx) => {
            const outer = radarPoint(cx, cy, radius, 100, idx, total);
            return (
              <line
                className="radar-spoke-line"
                key={idx}
                x1={cx}
                x2={outer.x}
                y1={cy}
                y2={outer.y}
              />
            );
          })}
        </g>

        {plotted.map((item) => (
          <polygon
            className="radar-player-poly"
            fill={item.color}
            fillOpacity={0.06}
            key={`${item.name}-poly`}
            points={radarPolygonPoints(cx, cy, radius, item.percents)}
            stroke={item.color}
            strokeOpacity={0.42}
            strokeWidth={1.5}
          />
        ))}
        {plotted.flatMap((item) =>
          item.percents.map((pct, idx) => {
            const pt = radarPoint(cx, cy, radius, pct, idx, total);
            return (
              <circle
                className="radar-vertex-dot"
                cx={pt.x}
                cy={pt.y}
                fill={item.color}
                fillOpacity={0.55}
                key={`${item.name}-dot-${idx}`}
                r={2.6}
                stroke={item.color}
                strokeOpacity={0.28}
                strokeWidth={0.9}
              />
            );
          }),
        )}

        <g className="radar-labels">
          {axes.map((axis, idx) => {
            if (!axis.label) return null;
            const labelRadius = radius + 28;
            const angle = radarAxisAngle(idx, total);
            const lx = cx + labelRadius * Math.cos(angle);
            const ly = cy + labelRadius * Math.sin(angle);
            let anchor: 'start' | 'middle' | 'end' = 'middle';
            if (Math.cos(angle) > 0.35) anchor = 'start';
            else if (Math.cos(angle) < -0.35) anchor = 'end';

            return (
              <text
                className="radar-axis-text"
                dy="0.35em"
                key={axis.axis}
                textAnchor={anchor}
                x={lx}
                y={ly}
              >
                {axis.label}
              </text>
            );
          })}
        </g>
      </svg>
      {axes.some((axis) => axis.label) ? (
        <p className="radar-disclaimer">2025/26 Premier League season data</p>
      ) : null}
    </div>
  );
}
