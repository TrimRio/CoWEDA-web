import { useState, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Minor-gridline helper ─────────────────────────────────────────────────────
// Returns evenly-spaced ticks between min and max (inclusive) at `step` intervals
function makeTicks(min, max, step) {
  const ticks = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

// ── Series definitions ────────────────────────────────────────────────────────
const SERIES = [
  { key: 'Ts_head',  label: 'Head Skin Temp.',    color: '#9333ea' },
  { key: 'Ts_arm',   label: 'Arm Skin Temp.',     color: '#ca8a04' },
  { key: 'Ts_torso', label: 'Torso Skin Temp.',   color: '#ea580c' },
  { key: 'Ts_leg',   label: 'Leg Skin Temp.',     color: '#4f46e5' },
  { key: 'Ts_foot',  label: 'Feet Skin Temp.',    color: '#0891b2' },
  { key: 'Ts_hand',  label: 'Hand Skin Temp.',    color: '#db2777' },
  { key: 'Tsk',      label: 'Exposed Skin Temp.', color: '#7c3aed', dash: '4 2' },
  { key: 'Tc',       label: 'Core Temp.',         color: '#15803d' },
];

// Threshold reference lines
const THRESHOLDS = [
  { value: 34, label: 'Hypothermia likely',       dash: '8 5',     width: 1.5 },
  { value: 15, label: 'Reduced manual dexterity', dash: '8 4 2 4', width: 1.5 },
  { value:  5, label: 'Cold injury likely',       dash: '3 3',     width: 1.5 },
  { value:  0, label: 'Tissue freezes',           dash: '',        width: 2   },
];

// ── CSV column definitions — exact match to CWEDOUTPUT.csv ───────────────────
const CSV_COLS = [
  { key: 'Time',       header: ' Time',        unit: ' min'   },
  { key: 'Ta_head',    header: ' Ta.head',     unit: ' C'     },
  { key: 'Ta_torso',   header: ' Ta.torso',    unit: ' C'     },
  { key: 'RH_torso',   header: ' RH.torso',    unit: ' '      },
  { key: 'Wind_torso', header: ' Wind.torso',  unit: ' m/s'   },
  { key: 'Tc',         header: ' Tc',          unit: ' C'     },
  { key: 'Tsk',        header: ' Tsk',         unit: ' C'     },
  { key: 'Mtot',       header: 'Mtot',         unit: ' W'     },
  { key: 'Mext',       header: ' Mext',        unit: ' W'     },
  { key: 'SW',         header: ' SW',          unit: ' kg'    },
  { key: 'Evap',       header: ' Evap',        unit: ' W'     },
  { key: 'Wsk',        header: ' Wsk',         unit: ' '      },
  { key: 'WLP',        header: ' WLP',         unit: '%'      },
  { key: 'Tm_arm',     header: ' Tm.arm',      unit: ' C'     },
  { key: 'Tm_leg',     header: ' Tm.leg',      unit: ' C'     },
  { key: 'Ts_head',    header: ' Ts.head',     unit: ' C'     },
  { key: 'Ts_torso',   header: ' Ts.torso',    unit: ' C'     },
  { key: 'Ts_arm',     header: 'Ts.arm',       unit: '  C'    },
  { key: 'Ts_hand',    header: ' Ts.hand',     unit: ' C'     },
  { key: 'Ts_leg',     header: ' Ts.leg',      unit: ' C'     },
  { key: 'Ts_foot',    header: 'Ts.foot',      unit: ' C'     },
  { key: 'Height',     header: ' Height',      unit: ' m'     },
  { key: 'Weight',     header: ' Weight',      unit: ' kg'    },
  { key: 'Body_fat',   header: ' Body fat',    unit: ' %'     },
  { key: 'Clothed',    header: ' Clothed',     unit: ' Y1/2N' },
  { key: 'Immersed',   header: ' Immersed',    unit: ' 1N'    },
  { key: 'Iclo_head',  header: ' Iclo.head',   unit: ' clo'   },
  { key: 'Iclo_torso', header: ' Iclo.torso',  unit: ' clo'   },
  { key: 'Iclo_arm',   header: ' Iclo.arm',    unit: ' clo'   },
  { key: 'Iclo_hand',  header: '   Iclo.hand', unit: ' clo'   },
  { key: 'Iclo_leg',   header: ' Iclo.leg',    unit: ' clo'   },
  { key: 'Iclo_feet',  header: ' Iclo.feet',   unit: ' clo'   },
  { key: 'Im_head',    header: ' Im.head',     unit: ' '      },
  { key: 'Im_torso',   header: ' Im.torso',    unit: ' '      },
  { key: 'Im_arm',     header: ' Im.arm',      unit: ' '      },
  { key: 'Im_hand',    header: ' Im.hand',     unit: ' '      },
  { key: 'Im_leg',     header: ' Im.leg',      unit: ' '      },
  { key: 'Im_feet',    header: ' Im.feet',     unit: ' '      },
];

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(simRows) {
  const headerRow = CSV_COLS.map(c => c.header).join(',');
  const unitRow   = CSV_COLS.map(c => c.unit).join(',');
  const dataRows  = simRows.map(r =>
    CSV_COLS.map(c => {
      const v = r[c.key];
      if (v === undefined || v === null) return '';
      if (typeof v === 'number' && isNaN(v)) return '-NaN';
      if (typeof v === 'number') return v.toFixed(2);
      return v;
    }).join(',')
  );
  const csv = [headerRow, unitRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'simoutput.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #d1d5db',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 11,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      <div style={{ marginBottom: 4, color: '#6b7280', fontWeight: 600 }}>
        t = {Math.round(Number(label))} min
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{Number(p.value).toFixed(1)} °C</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailsPlot
// Props:
//   simRows  — array of row objects from usePSDA
//   onClose  — called when the user closes the plot
// ─────────────────────────────────────────────────────────────────────────────
export default function DetailsPlot({ simRows, onClose, simTimeHours, isRest }) {
  const [visSeries,     setVisSeries]     = useState(() => Object.fromEntries(SERIES.map(s => [s.key, true])));
  const [visThresholds, setVisThresholds] = useState(() => Object.fromEntries(THRESHOLDS.map(t => [t.label, true])));

  const toggleSeries    = useCallback(key   => setVisSeries(p    => ({ ...p, [key]:   !p[key] })),   []);
  const toggleThreshold = useCallback(label => setVisThresholds(p => ({ ...p, [label]: !p[label] })), []);

  if (!simRows?.length) return null;

  // Downsample to ~600 points for render performance
  const step     = Math.max(1, Math.floor(simRows.length / 600));
  const plotData = simRows.filter((_, i) => i % step === 0);

  // Y-axis domain
  const allTemps = plotData.flatMap(r =>
    SERIES.filter(s => visSeries[s.key]).map(s => r[s.key]).filter(v => v != null && !isNaN(v))
  );
  const yMin = Math.floor(Math.min(-10, ...allTemps) / 5) * 5;
  const yMax = Math.ceil( Math.max( 40, ...allTemps) / 5) * 5;

  // Tick arrays — major every 5°C / ~30 min, minor every 1°C / ~10 min
  const xMax = plotData.length ? plotData[plotData.length - 1].Time : 0;
  const xMin = plotData.length ? plotData[0].Time : 0;
  const xMajorStep = xMax <= 120 ? 30 : xMax <= 360 ? 60 : 120;
  const xMinorStep = xMajorStep / 3;
  const xMajorTicks = makeTicks(Math.ceil(xMin / xMajorStep) * xMajorStep, xMax, xMajorStep);
  const xMinorTicks = makeTicks(Math.ceil(xMin / xMinorStep) * xMinorStep, xMax, xMinorStep)
    .filter(v => !xMajorTicks.includes(v));
  const yMajorTicks = makeTicks(yMin, yMax, 5);
  const yMinorTicks = makeTicks(yMin, yMax, 1).filter(v => v % 5 !== 0);

  // ── Styles (light, self-contained — immune to app dark theme) ───────────────
  const S = {
    overlay: {
      position: 'fixed', inset: 0, zIndex: 1050,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    dialog: {
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: 10,
      padding: '18px 20px',
      width: 'min(96vw, 1180px)',
      maxHeight: '94vh',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      color: '#212529',        // force dark text on light bg
      fontFamily: 'system-ui, sans-serif',
    },
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    title: { fontWeight: 700, fontSize: 15, color: '#212529' },
    body: { display: 'flex', gap: 14, flex: 1, minHeight: 0 },
    panel: {
      width: 165, flexShrink: 0, fontSize: 11,
      display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 4,
      color: '#212529',
    },
    panelHead: { fontWeight: 700, marginBottom: 4, color: '#212529' },
    panelSub:  { fontWeight: 700, marginTop: 10, marginBottom: 4, color: '#6b7280', fontSize: 10 },
    checkLabel: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#212529' },
    footer: { fontSize: 10, color: '#6b7280', textAlign: 'right' },
    btnClose: {
      background: 'none', border: '1px solid #ced4da', borderRadius: 4,
      padding: '2px 10px', cursor: 'pointer', fontSize: 14, color: '#495057',
    },
    btnDownload: {
      background: '#fff', border: '1px solid #ced4da', borderRadius: 4,
      padding: '3px 12px', cursor: 'pointer', fontSize: 11, color: '#212529',
      fontWeight: 500,
    },
  };

  return (
    <div style={S.overlay}>
      <div style={S.dialog}>

        {/* Header */}
        <div style={S.header}>
          <span style={S.title}>
            Details for Ensemble Results
            <span style={{ fontWeight: 400, fontSize: 12, color: '#6b7280', marginLeft: 10 }}>
              {isRest ? 'Rest' : 'Active'} · {simTimeHours ?? (isRest ? 24 : 4)} hr window
            </span>
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={S.btnDownload} onClick={() => exportCSV(simRows)}>
              ⬇ Download CSV
            </button>
            <button style={S.btnClose} onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Chart + right panel */}
        <div style={S.body}>

          {/* Chart */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={plotData} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="Time"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  ticks={xMajorTicks}
                  tickFormatter={v => Math.round(v)}
                  label={{ value: `Time in Minutes (${simTimeHours ?? (isRest ? 24 : 4)} hr window)`, position: 'insideBottom', offset: -14, fontSize: 12, fill: '#6b7280' }}
                  tick={{ fontSize: 10, fill: '#374151' }}
                  stroke="#9ca3af"
                />
                <YAxis
                  domain={[yMin, yMax]}
                  ticks={yMajorTicks}
                  label={{ value: 'Temperature in °C', angle: -90, position: 'insideLeft', offset: 14, fontSize: 12, fill: '#6b7280' }}
                  tick={{ fontSize: 10, fill: '#374151' }}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />

                {/* Minor X gridlines */}
                {xMinorTicks.map(v => (
                  <ReferenceLine key={`xminor-${v}`} x={v} stroke="#e5e7eb" strokeWidth={0.5} />
                ))}
                {/* Minor Y gridlines */}
                {yMinorTicks.map(v => (
                  <ReferenceLine key={`yminor-${v}`} y={v} stroke="#e5e7eb" strokeWidth={0.5} />
                ))}

                {/* Threshold reference lines */}
                {THRESHOLDS.filter(t => visThresholds[t.label]).map(t => (
                  <ReferenceLine
                    key={t.label}
                    y={t.value}
                    stroke="#111"
                    strokeDasharray={t.dash}
                    strokeWidth={t.width}
                  />
                ))}

                {/* Temperature series */}
                {SERIES.filter(s => visSeries[s.key]).map(s => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeDasharray={s.dash || ''}
                    dot={false}
                    strokeWidth={s.key === 'Tc' ? 2.5 : 1.5}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Right panel */}
          <div style={S.panel}>
            <div style={S.panelHead}>Show Selected:</div>
            {SERIES.map(s => (
              <label key={s.key} style={S.checkLabel}>
                <input
                  type="checkbox"
                  checked={!!visSeries[s.key]}
                  onChange={() => toggleSeries(s.key)}
                  style={{ accentColor: s.color, width: 13, height: 13 }}
                />
                <span style={{ color: s.color, fontWeight: 500 }}>
                  {s.label.replace(' Temp.', '').replace(' Skin', '')}
                </span>
              </label>
            ))}
            <div style={S.panelSub}>Thresholds</div>
            {THRESHOLDS.map(t => (
              <label key={t.label} style={S.checkLabel}>
                <input
                  type="checkbox"
                  checked={!!visThresholds[t.label]}
                  onChange={() => toggleThreshold(t.label)}
                  style={{ width: 13, height: 13 }}
                />
                {/* SVG line-style swatch */}
                <svg width={26} height={10} style={{ flexShrink: 0 }}>
                  <line
                    x1={1} y1={5} x2={25} y2={5}
                    stroke="#111"
                    strokeWidth={t.width}
                    strokeDasharray={t.dash || undefined}
                  />
                </svg>
                <span style={{ fontSize: 10 }}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          {simRows.length} timesteps · {plotData.length} plotted
          {step > 1 ? ` (1 in ${step} shown)` : ''}
        </div>
      </div>
    </div>
  );
}
