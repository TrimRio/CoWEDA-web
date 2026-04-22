import { useState, useMemo } from 'react';
import { ACTIVITIES, ACTIVITY_MODES, EXERTION_WATTS, SIM_TIME_REST, SIM_TIME_ACTIVE, ZONE_LABELS, ZONE_ORDER, RISK_BADGES, getRiskStatus, formatRiskTime } from './data/constants';
import { UNIT_SYSTEMS } from './utils/unitConversions';
import { DEFAULT_ENSEMBLES, DEFAULT_ENSEMBLE_NAMES, getDefaultEnsembleItems } from './data/ensembles';
import { useClothingData, itemKey, zonePrimaryClo } from './hooks/useClothingData';
import { usePSDA } from './hooks/usePSDA';
import Slider           from './components/Slider';
import Chips            from './components/Chips';
import EnsembleControls from './components/EnsembleControls';
import Silhouette       from './components/Silhouette';
import ClothingModal    from './components/ClothingModal';
import WeatherModal     from './components/WeatherModal';
import DetailsPlot      from './components/DetailsPlot';
import HelpDrawer       from './components/HelpDrawer';

export default function App() {
  // ── Load clothing data from CSV ────────────────────────────────────────────
  const { byZone, isLoading: clothingLoading, error: clothingError } = useClothingData();

  // ── Environmental state ────────────────────────────────────────────────────
  const [humidity, setHumidity] = useState(78);

  // ── Unit system ────────────────────────────────────────────────────────────
  const [unitSystem,   setUnitSystem]   = useState('SI'); // 'SI' | 'Imperial'
  const units = UNIT_SYSTEMS[unitSystem];

  // Display values stored in the active unit; model always receives SI
  const [tempDisplay, setTempDisplay] = useState(-12); // °C or °F
  const [windDisplay, setWindDisplay] = useState(1);   // m/s or mph

  function handleUnitSystemChange(newSystem) {
    const prev = UNIT_SYSTEMS[unitSystem];
    const next = UNIT_SYSTEMS[newSystem];
    setTempDisplay(next.temperature.fromSI(prev.temperature.toSI(tempDisplay)));
    setWindDisplay(next.wind.fromSI(prev.wind.toSI(windDisplay)));
    setUnitSystem(newSystem);
  }

  // SI values passed to the model
  const temp = units.temperature.toSI(tempDisplay);
  const wind = units.wind.toSI(windDisplay);

  // ── Activity state ─────────────────────────────────────────────────────────
  const [activityMode,  setActivityMode]  = useState('Active');  // 'Rest' | 'Active'
  const [exertion,      setExertion]      = useState('Light');   // 'Light' | 'Moderate' | 'Heavy'
  const [wattsInput,    setWattsInput]    = useState('200');     // string for the textbox

  const isRest       = activityMode === 'Rest';
  const activityWatts = isRest ? 0 : (Number(wattsInput) || 0);
  const simTimeHours  = isRest ? SIM_TIME_REST : SIM_TIME_ACTIVE;

  // Sync exertion chip → watts textbox (only in Active mode)
  function handleExertionChange(level) {
    if (level === 'Rest') {
      setActivityMode('Rest');
    } else {
      setActivityMode('Active');
      setExertion(level);
      setWattsInput(String(EXERTION_WATTS[level]));
    }
  }

  // Sync activity mode toggle
  function handleModeChange(mode) {
    setActivityMode(mode);
    if (mode === 'Active' && isRest) {
      // Restore watts from current exertion chip
      setWattsInput(String(EXERTION_WATTS[exertion]));
    }
  }

  // Manual watts text entry (active mode only)
  function handleWattsInput(e) {
    setWattsInput(e.target.value);
    // If user types a value matching a chip, highlight that chip
    const val = Number(e.target.value);
    const match = Object.entries(EXERTION_WATTS).find(([, w]) => w === val);
    if (match) setExertion(match[0]);
  }

  // ── Ensemble state ─────────────────────────────────────────────────────────
  const [ensembles, setEnsembles] = useState(DEFAULT_ENSEMBLE_NAMES);
  const [selEns,    setSelEns]    = useState(DEFAULT_ENSEMBLE_NAMES[0]);

  // ── Clothing selection ─────────────────────────────────────────────────────
  const emptyZones = { head: [], torso_arms: [], hands: [], legs: [], feet: [] };
  const [selectedKeysByZone, setSelectedKeysByZone] = useState(
    () => getDefaultEnsembleItems(DEFAULT_ENSEMBLE_NAMES[0]) ?? emptyZones
  );
  const [modalZone, setModalZone] = useState(null);

  // ── Flatten selected items for the calculator ──────────────────────────────
  const selectedItems = useMemo(() =>
    ZONE_ORDER.flatMap(zone =>
      (selectedKeysByZone[zone] || [])
        .map(key => (byZone[zone] || []).find(item => itemKey(item) === key))
        .filter(Boolean)
    ), [selectedKeysByZone, byZone]);

  // ── Plot / output settings ─────────────────────────────────────────────────
  const [showPlot,      setShowPlot]      = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [weatherOpen,   setWeatherOpen]   = useState(false);
  const [helpOpen,      setHelpOpen]      = useState(false);

  // ── Run thermal model ──────────────────────────────────────────────────────
  const { results, isCalculating, simRows, isPlotting, runPlot } = usePSDA({ temp, humidity, wind, activityWatts, isRest, simTimeHours, selectedItems });

  // ── Build risk rows from calculator output ─────────────────────────────────
  const zoneRiskRows = useMemo(() => {
    if (!results) return [
      { label: 'Exposed Skin / Frostbite', time: '—', status: 'neutral', badge: '—' },
      { label: 'Hands / Frostbite',        time: '—', status: 'neutral', badge: '—' },
      { label: 'Feet / Frostbite',         time: '—', status: 'neutral', badge: '—' },
      { label: 'Body / Hypothermia',       time: '—', status: 'neutral', badge: '—' },
      { label: 'Comfort (until sweating)', time: '—', status: 'neutral', badge: '—' },
    ];
    const cap = simTimeHours;
    const face    = getRiskStatus(results.TT_exposed_skin, cap);
    const hand    = getRiskStatus(results.TT_Tshand_crit, cap);
    const foot    = getRiskStatus(results.TT_Tsfoot_crit, cap);
    const core    = getRiskStatus(results.TC34, cap);
    const comfort = getRiskStatus(results.TT_WSK_crit, cap);
    return [
      { label: 'Exposed Skin / Frostbite', time: formatRiskTime(results.TT_exposed_skin, cap),  status: face,    badge: RISK_BADGES[face]    },
      { label: 'Hands / Frostbite',        time: formatRiskTime(results.TT_Tshand_crit, cap),   status: hand,    badge: RISK_BADGES[hand]    },
      { label: 'Feet / Frostbite',         time: formatRiskTime(results.TT_Tsfoot_crit, cap),   status: foot,    badge: RISK_BADGES[foot]    },
      { label: 'Body / Hypothermia',       time: formatRiskTime(results.TC34, cap),             status: core,    badge: RISK_BADGES[core]    },
      { label: 'Comfort (until sweating)', time: formatRiskTime(results.TT_WSK_crit, cap),      status: comfort, badge: RISK_BADGES[comfort] },
    ];
  }, [results, simTimeHours]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function toggleItem(zone, key) {
    setSelectedKeysByZone(prev => {
      const current = prev[zone] || [];
      const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
      return { ...prev, [zone]: next };
    });
  }
  function handleEnsSelect(name) {
    setSelEns(name);
    const items = getDefaultEnsembleItems(name);
    if (items) setSelectedKeysByZone(items);
    // Custom (user-created) ensembles don't have a preset item list,
    // so we leave the current selection intact when items is null.
  }
  function handleSaveNew(newName) {
    setEnsembles(prev => [...prev, newName]);
    setSelEns(newName);
    // selectedKeysByZone stays as-is — the new ensemble captures current clothing
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
          <span className="logo">Cold Weather Ensemble Decision Aid Web Application (CoWEDA-web)</span>
          <div className="d-flex gap-2 align-items-center">

            {/* Plot button */}
            <button
                className="btn btn-sm btn-primary"
                style={{fontSize: 12, padding: '4px 14px', fontWeight: 500}}
                disabled={isPlotting || !results}
                onClick={() => {
                  runPlot();
                  setShowPlot(true);
                }}
            >
              {isPlotting ? (
                  <><span className="spinner-border spinner-border-sm me-1" role="status"/>Plotting…</>
              ) : 'Plot'}
            </button>

            {/* Settings dropdown */}
            <div className="dropdown">
              <button
                  className="btn btn-sm btn-primary"
                  style={{fontSize: 12, padding: '4px 14px', fontWeight: 500}}
                  onClick={() => setSettingsOpen(o => !o)}
              >
                Settings
              </button>
              {settingsOpen && (
                  <div
                      className="dropdown-menu show"
                      style={{right: 0, left: 'auto', minWidth: 220, padding: '10px 14px', fontSize: 12}}
                      onMouseLeave={() => setSettingsOpen(false)}
                  >
                    <div style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Units
                    </div>
                    <div style={{display: 'flex', border: '1.5px solid #c0cfe8', borderRadius: 8, overflow: 'hidden'}}>
                      {['SI', 'Imperial'].map((sys, i) => (
                          <button
                              key={sys}
                              onClick={() => handleUnitSystemChange(sys)}
                              style={{
                                flex: 1,
                                fontSize: 11,
                                fontWeight: unitSystem === sys ? 600 : 400,
                                padding: '5px 0',
                                cursor: 'pointer',
                                border: 'none',
                                borderLeft: i > 0 ? '1.5px solid #c0cfe8' : 'none',
                                borderRadius: 0,
                                background: unitSystem === sys ? '#2a6db5' : 'transparent',
                                color: unitSystem === sys ? '#fff' : 'var(--muted)',
                                transition: 'background 0.15s, color 0.15s',
                              }}
                          >
                            {sys === 'SI' ? 'SI  (°C, m/s)' : 'Imperial  (°F, mph)'}
                          </button>
                      ))}
                    </div>
                  </div>
              )}
            </div>

            {/* Help button */}
            <button
                className="btn btn-sm btn-primary"
                style={{fontSize: 12, padding: '4px 14px', fontWeight: 500}}
                onClick={() => setHelpOpen(true)}
                aria-label="Open user guide"
                title="User Guide"
            >
              Help
            </button>

          </div>
        </nav>

        <div className="container-xxl py-3 px-3">
          <div className="row g-3">

            {/* ── Left column ── */}
            <div className="col-12 col-lg-4">
              <div className="card p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2" style={{marginBottom: 0}}>
                  <div className="card-title-label mb-0">Environmental Parameters</div>
                  <button
                      className="btn btn-sm btn-outline-secondary"
                      style={{fontSize: 11, padding: '2px 10px'}}
                      onClick={() => setWeatherOpen(true)}
                  >
                    🌤 Local Weather
                  </button>
                </div>
                <div style={{marginBottom: 12}}/>
                <Slider label="Air Temperature"
                        min={units.temperature.min} max={units.temperature.max} step={units.temperature.step}
                        value={units.temperature.format(tempDisplay)} onChange={setTempDisplay}
                        unit={units.temperature.unit}
                        trackStyle={{background: 'linear-gradient(to right,#3B8BD4,#93c5fd,#fde68a,#f97316,#ef4444)'}}/>
                <Slider label="Relative Humidity" min={0} max={100} value={humidity} onChange={setHumidity} unit="%"
                        trackStyle={{background: 'linear-gradient(to right,#fef9c3,#7dd3fc,#1e40af)'}}/>
                <Slider label="Wind Speed"
                        min={units.wind.min} max={units.wind.max} step={units.wind.step}
                        value={units.wind.format(windDisplay)} onChange={setWindDisplay}
                        unit={units.wind.unit}
                        trackStyle={{background: 'linear-gradient(to right,#e0f2fe,#7dd3fc,#0369a1,#1e3a5f)'}}/>
              </div>

              <div className="card p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="card-title-label mb-0">Activity</div>
                  <span style={{fontSize: 11, color: 'var(--muted)'}}>
                  Sim limit: {isRest ? '24 hrs' : '4 hrs'}
                </span>
                </div>

                {/* ── Mode toggle: Rest / Active ── */}
                <div className="mb-3" style={{
                  display: 'flex',
                  border: '1.5px solid #c0cfe8',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--card-bg)',
                }}>
                  {ACTIVITY_MODES.map((mode, i) => (
                      <button
                          key={mode}
                          onClick={() => handleModeChange(mode)}
                          style={{
                            flex: 1,
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '6px 0',
                            cursor: 'pointer',
                            border: 'none',
                            borderLeft: i > 0 ? '1.5px solid #c0cfe8' : 'none',
                            borderRadius: 0,
                            background: activityMode === mode ? '#2a6db5' : 'transparent',
                            color: activityMode === mode ? '#fff' : 'var(--muted)',
                            transition: 'background 0.15s, color 0.15s',
                            letterSpacing: '0.01em',
                          }}
                      >
                        {mode}
                      </button>
                  ))}
                </div>

                {/* ── Exertion chips (grayed in Rest mode) ── */}
                <div className="field-label mb-1">Exertion level</div>
                <div style={{
                  opacity: isRest ? 0.38 : 1,
                  pointerEvents: isRest ? 'none' : 'auto',
                  transition: 'opacity .2s'
                }}>
                  <Chips
                      options={['Light', 'Moderate', 'Heavy']}
                      value={isRest ? null : exertion}
                      onChange={handleExertionChange}
                  />
                </div>

                {/* ── Metabolic rate textbox ── */}
                <div className="d-flex align-items-center gap-2 mt-3">
                <span className="field-label mb-0" style={{whiteSpace: 'nowrap'}}>
                  Metabolic rate
                </span>
                  <div className="d-flex align-items-center gap-1 flex-grow-1">
                    <input
                        type="number"
                        min={0}
                        max={1000}
                        step={10}
                        value={isRest ? '0' : wattsInput}
                        onChange={handleWattsInput}
                        disabled={isRest}
                        className="form-control form-control-sm"
                        style={{width: 80, fontSize: 13, textAlign: 'right', opacity: isRest ? 0.5 : 1}}
                    />
                    <span style={{fontSize: 12, color: 'var(--muted)'}}>W</span>
                    {isRest && (
                        <span style={{fontSize: 11, color: 'var(--muted)', marginLeft: 4}}>
                      (basal MR)
                    </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="col-12 col-lg-8">
              <div className="card p-3 mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="card-title-label mb-0">Risk Assessment</div>
                    <span style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      background: 'var(--border)',
                      borderRadius: 4,
                      padding: '1px 6px'
                    }}>
                    {isRest ? 'Rest · 24 hr window' : 'Active · 4 hr window'}
                  </span>
                  </div>
                  {isCalculating && <span style={{fontSize: 11, color: 'var(--muted)'}}>Calculating…</span>}
                </div>
                <div className="d-flex gap-3 align-items-start">
                  <Silhouette selectedKeysByZone={selectedKeysByZone} onZoneClick={setModalZone} byZone={byZone}
                              zoneRiskRows={zoneRiskRows}/>
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
                    <span className="badge rounded-pill text-bg-secondary" style={{fontSize: '10px'}}>
                    {totalItems} items
                  </span>
                  </div>
                </div>
                <EnsembleControls ensembles={ensembles} selected={selEns}
                                  onSelect={handleEnsSelect} onSave={handleEnsSave} onDelete={handleEnsDelete}
                                  onSaveNew={handleSaveNew}/>
                {grouped.length === 0 ? (
                    <div style={{fontSize: 12, color: 'var(--muted)', padding: '8px 0'}}>
                      No clothing selected — click a body zone on the figure above to add items.
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                      {grouped.map(g => {
                        const totalClo = g.items.reduce((s, i) => s + zonePrimaryClo(i, g.zone), 0);
                        return (
                            <div key={g.zone}>
                              <div className="zone-group-label">{ZONE_LABELS[g.zone]}</div>
                              <div className="d-flex flex-column gap-1">
                                {g.items.map(item => {
                                  const cloStr = g.zone === 'torso_arms'
                                      ? `${item.Rcl_torso_clo.toFixed(2)} / ${item.Rcl_arm_clo.toFixed(2)} clo`
                                      : `${zonePrimaryClo(item, g.zone).toFixed(2)} clo`;
                                  return (
                                      <div key={itemKey(item)} className="clothing-row">
                                        <div style={{
                                          width: 28, height: 28, flexShrink: 0,
                                          borderRadius: 4, overflow: 'hidden',
                                          background: '#e0f2fe', marginRight: 8,
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          <img
                                            src={`/clothing/${item.image}`}
                                            alt={item.itemDescription}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={e => {
                                              e.target.style.display = 'none';
                                              e.target.nextSibling.style.display = 'block';
                                            }}
                                          />
                                          <span style={{ display: 'none', fontSize: 14, lineHeight: 1 }}>🧥</span>
                                        </div>
                                        <span className="clothing-name flex-grow-1">{item.itemDescription}</span>
                                        <span className="clothing-ins">{cloStr}</span>
                                      </div>
                                  );
                                })}
                                <div style={{fontSize: 11, color: 'var(--muted)', paddingLeft: 2, marginTop: 2}}>
                                  Total: {totalClo.toFixed(2)} clo
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>


        {weatherOpen && (
            <WeatherModal
                onApply={({temp: t, humidity: h, wind: w}) => {
                  // Weather data arrives in SI; clamp to SI range then convert to display unit
                  const clampedT = Math.max(-52, Math.min(5, t));
                  const clampedW = Math.max(0, Math.min(22.4, w));
                  setTempDisplay(units.temperature.fromSI(clampedT));
                  setHumidity(Math.max(0, Math.min(100, h)));
                  setWindDisplay(units.wind.fromSI(clampedW));
                }}
                onClose={() => setWeatherOpen(false)}
            />
        )}

        <ClothingModal
            zone={modalZone}
            selectedKeys={selectedKeysByZone[modalZone] || []}
            onToggle={toggleItem}
            onClose={() => setModalZone(null)}
            items={byZone[modalZone] || []}
        />

        {showPlot && simRows && (
            <DetailsPlot
                simRows={simRows}
                onClose={() => setShowPlot(false)}
                simTimeHours={simTimeHours}
                isRest={isRest}
            />
        )}

        {helpOpen && <HelpDrawer onClose={() => setHelpOpen(false)}/>}
      </>
  );
}
