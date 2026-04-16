import { useState, useMemo } from 'react';
import { ACTIVITIES, ZONE_LABELS, ZONE_ORDER, RISK_BADGES, getRiskStatus, formatRiskTime } from './data/constants';
import { useClothingData, itemKey } from './hooks/useClothingData';
import { usePSDA } from './hooks/usePSDA';
import Slider           from './components/Slider';
import Chips            from './components/Chips';
import EnsembleControls from './components/EnsembleControls';
import Silhouette       from './components/Silhouette';
import ClothingModal    from './components/ClothingModal';

export default function App() {
  // ── Load clothing data from CSV ────────────────────────────────────────────
  const { byZone, isLoading: clothingLoading, error: clothingError } = useClothingData();

  // ── Environmental state ────────────────────────────────────────────────────
  const [temp,     setTemp]     = useState(-12);
  const [humidity, setHumidity] = useState(78);
  const [wind,     setWind]     = useState(1);

  // ── Activity state ─────────────────────────────────────────────────────────
  const [activityWatts, setActivityWatts] = useState(116);
  const [exertion,      setExertion]      = useState('Light');
  const [duration,      setDuration]      = useState('1 hr');

  // ── Ensemble state ─────────────────────────────────────────────────────────
  const [ensembles, setEnsembles] = useState(['Default Ensemble', 'Arctic Kit', 'Light Layer']);
  const [selEns,    setSelEns]    = useState('Default Ensemble');

  // ── Clothing selection ─────────────────────────────────────────────────────
  const [selectedKeysByZone, setSelectedKeysByZone] = useState({
    head: [], torso: [], hands: [], legs: [], feet: [], arms: [],
  });
  const [modalZone, setModalZone] = useState(null);

  // ── Flatten selected items for the calculator ──────────────────────────────
  const selectedItems = useMemo(() =>
    ZONE_ORDER.flatMap(zone =>
      (selectedKeysByZone[zone] || [])
        .map(key => (byZone[zone] || []).find(item => itemKey(item) === key))
        .filter(Boolean)
    ), [selectedKeysByZone, byZone]);

  // ── Run thermal model ──────────────────────────────────────────────────────
  const { results, isCalculating } = usePSDA({ temp, humidity, wind, activityWatts, selectedItems });

  // ── Build risk rows from calculator output ─────────────────────────────────
  const zoneRiskRows = useMemo(() => {
    if (!results) return [
      { label: 'Face / Frostbite',   time: '—', status: 'neutral', badge: '—' },
      { label: 'Hands / Frostbite',  time: '—', status: 'neutral', badge: '—' },
      { label: 'Feet / Frostbite',   time: '—', status: 'neutral', badge: '—' },
      { label: 'Body / Hypothermia', time: '—', status: 'neutral', badge: '—' },
    ];
    const face = getRiskStatus(results.TT_Ts_min);
    const hand = getRiskStatus(results.TT_Tshand_crit);
    const foot = getRiskStatus(results.TT_Tsfoot_crit);
    const core = getRiskStatus(results.TC34);
    return [
      { label: 'Face / Frostbite',   time: formatRiskTime(results.TT_Ts_min),      status: face, badge: RISK_BADGES[face] },
      { label: 'Hands / Frostbite',  time: formatRiskTime(results.TT_Tshand_crit), status: hand, badge: RISK_BADGES[hand] },
      { label: 'Feet / Frostbite',   time: formatRiskTime(results.TT_Tsfoot_crit), status: foot, badge: RISK_BADGES[foot] },
      { label: 'Body / Hypothermia', time: formatRiskTime(results.TC34),            status: core, badge: RISK_BADGES[core] },
    ];
  }, [results]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function toggleItem(zone, key) {
    setSelectedKeysByZone(prev => {
      const current = prev[zone] || [];
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, [zone]: next };
    });
  }
  function handleEnsSave(newName) {
    setEnsembles(prev => prev.map(e => e === selEns ? newName : e));
    setSelEns(newName);
  }
  function handleEnsDelete() {
    if (ensembles.length <= 1) return;
    const next = ensembles.filter(e => e !== selEns);
    setEnsembles(next); setSelEns(next[0]);
  }

  // ── Derived display data ───────────────────────────────────────────────────
  const totalItems = selectedItems.length;
  const grouped = ZONE_ORDER.map(zone => ({
    zone,
    items: (selectedKeysByZone[zone] || [])
      .map(key => (byZone[zone] || []).find(i => itemKey(i) === key))
      .filter(Boolean),
  })).filter(g => g.items.length > 0);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (clothingLoading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <div className="spinner-border spinner-border-sm me-2" role="status" />
          Loading clothing data…
        </div>
      </div>
    );
  }

  if (clothingError) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--danger)' }}>
          <strong>Failed to load CIEdata.csv</strong>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{clothingError}</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>Make sure CIEdata.csv is in the <code>public/</code> folder.</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <nav className="topbar d-flex align-items-center justify-content-between">
        <span className="logo">CoWEDA</span>
        <div className="d-flex gap-1">
          <a className="nav-link active">Dashboard</a>
          <a className="nav-link">Settings</a>
        </div>
      </nav>

      <div className="container-fluid p-3">
        <div className="row g-3">

          {/* ── Left column ── */}
          <div className="col-12 col-lg-4">
            <div className="card p-3 mb-3">
              <div className="card-title-label">Environmental Parameters</div>
              <Slider label="Air Temperature" min={-40} max={20} value={temp} onChange={setTemp} unit="°C"
                trackStyle={{ background: 'linear-gradient(to right,#3B8BD4,#93c5fd,#fde68a,#f97316,#ef4444)' }} />
              <Slider label="Relative Humidity" min={0} max={100} value={humidity} onChange={setHumidity} unit="%"
                trackStyle={{ background: 'linear-gradient(to right,#fef9c3,#7dd3fc,#1e40af)' }} />
              <Slider label="Wind Speed" min={0} max={60} value={wind} onChange={setWind} unit="m/s"
                trackStyle={{ background: 'linear-gradient(to right,#e0f2fe,#7dd3fc,#0369a1,#1e3a5f)' }} />
            </div>

            <div className="card p-3">
              <div className="card-title-label">Activity</div>
              <div className="field-label mb-1">Activity type</div>
              <select className="form-select form-select-sm mb-2"
                value={activityWatts} onChange={e => setActivityWatts(Number(e.target.value))}>
                {ACTIVITIES.map(a => <option key={a.label} value={a.value}>{a.label}</option>)}
              </select>
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="field-label mb-0" style={{ whiteSpace: 'nowrap' }}>Metabolic rate</span>
                <div className="met-val flex-grow-1">{activityWatts ? `${activityWatts} W/m²` : '— W/m²'}</div>
              </div>
              <hr className="soft" />
              <div className="field-label mb-1">Exertion level</div>
              <Chips options={['Rest','Light','Moderate','Heavy']} value={exertion} onChange={setExertion} />
              <div className="field-label mt-2 mb-1">Duration</div>
              <Chips options={['1 hr','2 hrs','4 hrs','8 hrs','24 hrs']} value={duration} onChange={setDuration} />
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="col-12 col-lg-8">
            <div className="card p-3 mb-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="card-title-label mb-0">Risk Assessment</div>
                {isCalculating && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Calculating…</span>}
              </div>
              <div className="d-flex gap-3 align-items-start">
                <Silhouette selectedKeysByZone={selectedKeysByZone} onZoneClick={setModalZone} byZone={byZone} />
                <div className="d-flex flex-column gap-2 flex-grow-1">
                  {zoneRiskRows.map((z, i) => (
                    <div key={i} className={`zone-row ${z.status}`}>
                      <span className="zone-name">{z.label}</span>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`zone-time ${z.status}`}>{z.time}</span>
                        <span className={`badge-risk badge-${z.status}`}>{z.badge}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="d-flex align-items-center gap-2">
                  <div className="card-title-label mb-0">Selected Clothing</div>
                  <span className="badge rounded-pill text-bg-secondary" style={{ fontSize: '10px' }}>
                    {totalItems} items
                  </span>
                </div>
              </div>
              <EnsembleControls ensembles={ensembles} selected={selEns}
                onSelect={setSelEns} onSave={handleEnsSave} onDelete={handleEnsDelete} />
              {grouped.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--muted)', padding: '8px 0' }}>
                  No clothing selected — click a body zone on the figure above to add items.
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {grouped.map(g => (
                    <div key={g.zone}>
                      <div className="zone-group-label">{ZONE_LABELS[g.zone]}</div>
                      <div className="d-flex flex-column gap-1">
                        {g.items.map(item => {
                          const clo = item.Rcl_torso_clo || item.Rcl_foot_clo || item.Rcl_head_clo || item.Rcl_hand_clo || 0;
                          return (
                            <div key={itemKey(item)} className="clothing-row">
                              <span className="clothing-name flex-grow-1">{item.itemDescription}</span>
                              <span className="clothing-ins">{clo.toFixed(2)} clo</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ClothingModal
        zone={modalZone}
        selectedKeys={selectedKeysByZone[modalZone] || []}
        onToggle={toggleItem}
        onClose={() => setModalZone(null)}
        items={byZone[modalZone] || []}
      />
    </>
  );
}
