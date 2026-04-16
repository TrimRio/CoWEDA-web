import { RISK_COLORS } from '../data/constants';

// Shapes for each UI zone. torso_arms combines the torso rect + both arm rects.
const ZONE_SHAPES = {
  head:       [{ x:19, y:0,   w:22, h:22, r:11 }],
  torso_arms: [
    { x:15, y:25, w:30, h:42, r:3 },   // torso
    { x:2,  y:25, w:11, h:42, r:3 },   // left arm
    { x:47, y:25, w:11, h:42, r:3 },   // right arm
  ],
  hands: [{ x:2,  y:68, w:11, h:8, r:2 }, { x:47, y:68, w:11, h:8, r:2 }],
  legs:  [{ x:15, y:70, w:13, h:46, r:3 }, { x:32, y:70, w:13, h:46, r:3 }],
  feet:  [{ x:11, y:114, w:17, h:9, r:3 }, { x:30, y:114, w:17, h:9, r:3 }],
};

// Map each silhouette zone to the index in zoneRiskRows:
//   0 = Exposed Skin / Frostbite (head/face)
//   1 = Hands / Frostbite
//   2 = Feet / Frostbite
//   3 = Body / Hypothermia  (torso_arms + legs)
const ZONE_RISK_ROW_INDEX = {
  head:       0,
  torso_arms: 3,
  hands:      1,
  legs:       3,
  feet:       2,
};

// Tinted fill colors per risk level (low opacity, used when clothed)
const RISK_FILL = {
  crit:    'rgba(214, 64, 69,  0.18)',
  warn:    'rgba(230, 168, 23, 0.18)',
  ok:      'rgba(76, 154, 90,  0.18)',
  neutral: 'rgba(156,163,175,  0.12)',
};

function ZoneShape({ zoneKey, onClick, selectedKeys, riskStatus }) {
  const status    = riskStatus || 'neutral';
  const riskColor = RISK_COLORS[status];
  const hasItems  = selectedKeys?.length > 0;
  const rects     = ZONE_SHAPES[zoneKey] || [];

  // Fill: transparent when no clothing, tinted risk color when clothed
  const fillColor  = hasItems ? RISK_FILL[status] : 'transparent';
  const fillOpacity = 1; // opacity already baked into the rgba above

  return (
    <g className="zone-hit" onClick={() => onClick(zoneKey)} style={{ cursor: 'pointer' }}>
      {rects.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r}
            fill={fillColor}
            fillOpacity={fillOpacity} />
          {/* Clothing icon on first shape only */}
          {hasItems && i === 0 && (
            <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fontSize={Math.min(r.w, r.h) * 0.45}
              style={{ pointerEvents: 'none' }}>
              🧥
            </text>
          )}
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.r}
            fill="none" stroke={riskColor} strokeWidth="2.5" opacity="0.95" />
        </g>
      ))}
    </g>
  );
}

export default function Silhouette({ selectedKeysByZone, onZoneClick, zoneRiskRows }) {
  const zones = ['head', 'torso_arms', 'hands', 'legs', 'feet'];

  // Extract per-zone risk status from zoneRiskRows (or fall back to neutral)
  function getRisk(zoneKey) {
    const idx = ZONE_RISK_ROW_INDEX[zoneKey];
    return zoneRiskRows?.[idx]?.status ?? 'neutral';
  }

  return (
    <div className="figure-wrap" style={{ width: 82 }}>
      <svg width="82" viewBox="0 0 60 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        {zones.map(z => (
          <ZoneShape
            key={z}
            zoneKey={z}
            onClick={onZoneClick}
            selectedKeys={selectedKeysByZone[z] || []}
            riskStatus={getRisk(z)}
          />
        ))}
      </svg>
      <div style={{ fontSize: 9, color: 'var(--muted)', textAlign: 'center', marginTop: 4, lineHeight: 1.3 }}>
        Click zone to<br />select clothing
      </div>
    </div>
  );
}
