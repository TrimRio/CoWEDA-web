import { useState, useEffect, useRef } from 'react';

// ── Section definitions ────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'environment',   label: 'Environmental Parameters' },
  { id: 'activity',      label: 'Activity Settings' },
  { id: 'clothing',      label: 'clothing & Ensembles' },
  { id: 'risk',          label: 'Risk Assessment' },
  { id: 'plot',          label: 'Details Plot' },
  { id: 'weather',       label: 'Local Weather Import' },
  { id: 'units',         label: 'Units & Settings' },
  { id: 'methodology',   label: 'Methodology' },
];

// ── Placeholder figure component ───────────────────────────────────────────────
function PlaceholderFigure({ label, height = 160 }) {
  return (
    <div style={{
      width: '100%',
      height,
      background: 'linear-gradient(135deg, #e8f0f7 0%, #d0e4f0 100%)',
      border: '1px dashed #a8c4d8',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '14px 0',
      gap: 6,
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7aadcc" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
      <span style={{ fontSize: 11, color: '#7aadcc', fontStyle: 'italic' }}>{label}</span>
    </div>
  );
}

// ── Callout box ────────────────────────────────────────────────────────────────
function Callout({ type = 'info', children }) {
  const styles = {
    info:    { bg: '#f0f9ff', border: '#bae6fd', icon: 'ℹ️' },
    tip:     { bg: '#f0fdf4', border: '#bbf7d0', icon: '💡' },
    warning: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️' },
  };
  const s = styles[type];
  return (
    <div style={{
      background: s.bg,
      border: `0.5px solid ${s.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
      lineHeight: 1.65,
      color: 'var(--text)',
      margin: '12px 0',
      display: 'flex',
      gap: 10,
    }}>
      <span style={{ flexShrink: 0, fontSize: 14 }}>{s.icon}</span>
      <div>{children}</div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────
function SectionHeading({ id, children }) {
  return (
    <h2 id={id} style={{
      fontSize: 15,
      fontWeight: 700,
      color: 'var(--navy)',
      margin: '0 0 10px 0',
      paddingBottom: 8,
      borderBottom: '1.5px solid var(--border)',
      scrollMarginTop: 20,
    }}>
      {children}
    </h2>
  );
}

function SubHeading({ children }) {
  return (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', margin: '16px 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </h3>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', margin: '0 0 10px 0' }}>{children}</p>;
}

// ── Main drawer ────────────────────────────────────────────────────────────────
export default function HelpDrawer({ onClose }) {
  const [activeSection, setActiveSection] = useState('overview');
  const contentRef = useRef(null);

  // Track which section is in view as the user scrolls
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function onScroll() {
      const offsets = SECTIONS.map(s => {
        const node = el.querySelector(`#${s.id}`);
        return node ? { id: s.id, top: node.getBoundingClientRect().top } : null;
      }).filter(Boolean);

      // Find the last section whose top is above the halfway point of the panel
      const midpoint = window.innerHeight / 2;
      let current = offsets[0]?.id;
      for (const o of offsets) {
        if (o.top < midpoint) current = o.id;
      }
      if (current) setActiveSection(current);
    }

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id) {
    const el = contentRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  }

  // Trap focus / close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 1050,
          animation: 'fadeIn 0.18s ease',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '100%',
        maxWidth: 780,
        background: '#fff',
        zIndex: 1051,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        animation: 'slideInRight 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--navy)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>📖</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
              CoWEDA User Guide
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          >
            ✕
          </button>
        </div>

        {/* Body: TOC sidebar + content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Sticky TOC sidebar */}
          <nav style={{
            width: 186,
            flexShrink: 0,
            borderRight: '0.5px solid var(--border)',
            padding: '16px 0',
            overflowY: 'auto',
            background: '#f9fafb',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 16px 8px' }}>
              Contents
            </div>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: activeSection === s.id ? '#e8f0f7' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${activeSection === s.id ? 'var(--blue)' : 'transparent'}`,
                  padding: '7px 16px',
                  fontSize: 12,
                  fontWeight: activeSection === s.id ? 600 : 400,
                  color: activeSection === s.id ? 'var(--navy)' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'background 0.12s, color 0.12s',
                  lineHeight: 1.4,
                }}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Scrollable content */}
          <div
            ref={contentRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 28px',
            }}
          >

            {/* ── Overview ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="overview">Overview</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. CoWEDA (Cold Weather Ensemble Decision Aid) is a thermal risk assessment tool designed to help users evaluate the cold-weather protection provided by different clothing ensembles under varying environmental and activity conditions.
              </P>
              <P>
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. The tool combines a validated human thermoregulation model with a comprehensive clothing insulation database to estimate time-to-risk thresholds for frostbite and hypothermia.
              </P>
              <PlaceholderFigure label="Figure 1 — CoWEDA dashboard overview" height={180} />
              <Callout type="tip">
                <strong>Quick start:</strong> Set the environmental sliders to your expected conditions, choose an activity level, click a body zone on the silhouette to add clothing, and read the Risk Assessment panel for time-to-threshold estimates.
              </Callout>
              <P>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </P>
            </section>

            {/* ── Environmental Parameters ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="environment">Environmental Parameters</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. The three environmental sliders control the primary atmospheric inputs to the thermal model.
              </P>

              <SubHeading>Air Temperature</SubHeading>
              <P>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Temperature range spans from −52 °C (−62 °F) to +5 °C (+41 °F), covering the full spectrum of cold-weather operational environments. Values outside this range are clamped at model boundaries.
              </P>

              <SubHeading>Relative Humidity</SubHeading>
              <P>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Humidity affects both convective heat loss and the insulating properties of certain clothing materials, particularly those with moisture-wicking or hydrophobic treatments.
              </P>

              <SubHeading>Wind Speed</SubHeading>
              <P>
                Excepteur sint occaecat cupidatat non proident. Wind dramatically accelerates convective heat transfer from exposed skin surfaces. Even moderate wind speeds of 5–10 m/s can reduce effective insulation by 30–40% compared to still-air conditions.
              </P>

              <PlaceholderFigure label="Figure 2 — Environmental parameter sliders" height={130} />

              <Callout type="info">
                All three parameters interact non-linearly in the underlying PSDA thermal model. Small changes in wind speed at low temperatures can have a disproportionate effect on predicted risk times.
              </Callout>
            </section>

            {/* ── Activity Settings ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="activity">Activity Settings</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Activity level determines the metabolic heat generation rate used in the simulation, which is one of the most significant variables in the thermal model.
              </P>

              <SubHeading>Rest vs. Active</SubHeading>
              <P>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. In <strong>Rest</strong> mode the model uses basal metabolic rate (approximately 80 W) and runs a 24-hour simulation window. In <strong>Active</strong> mode the window is reduced to 4 hours to reflect realistic continuous exertion limits.
              </P>

              <SubHeading>Exertion Level</SubHeading>
              <P>
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. The three preset exertion chips map to representative metabolic rates: Light (~175 W), Moderate (~300 W), and Heavy (~450 W). These correspond to activities such as slow walking, patrol marching, and sustained manual labor respectively.
              </P>

              <SubHeading>Custom Metabolic Rate</SubHeading>
              <P>
                At vero eos et accusamus et iusto odio dignissimos ducimus. For advanced users, the watts input field accepts any value from 0–1000 W. When a value matching a preset is entered the corresponding chip is automatically highlighted.
              </P>

              <PlaceholderFigure label="Figure 3 — Activity panel with exertion chips and metabolic rate input" height={140} />
            </section>

            {/* ── clothing & Ensembles ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="clothing">Clothing &amp; Ensembles</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Clothing selection is the primary output-shaping variable in CoWEDA. Items are organized by body zone and each carries empirically measured insulation values (clo units) from the CIE clothing database.
              </P>

              <SubHeading>Selecting Items</SubHeading>
              <P>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi. Click any highlighted body zone on the silhouette figure to open the Clothing Modal for that zone. Items can be toggled on or off; multiple items per zone are supported and their insulation values are summed.
              </P>

              <PlaceholderFigure label="Figure 4 — Clothing modal showing torso/arms zone items" height={200} />

              <SubHeading>Clo Values</SubHeading>
              <P>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat. One clo unit is defined as the insulation required to keep a resting person comfortable at 21 °C. Each clothing card shows the measured clo value(s); torso/arms items show separate torso and arm values.
              </P>

              <SubHeading>Ensembles</SubHeading>
              <P>
                Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil. Ensembles are named configurations of clothing that can be saved, renamed, and recalled. Several standard ensembles are provided as starting points. Use the ensemble controls to compare protection levels between different outfit combinations.
              </P>

              <Callout type="warning">
                Deleting an ensemble is permanent within the current session. Export or note your selections before removing a configuration you may need later.
              </Callout>
            </section>

            {/* ── Risk Assessment ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="risk">Risk Assessment</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. The Risk Assessment panel is the primary output display, showing predicted time-to-threshold for five physiological risk endpoints.
              </P>

              <SubHeading>Risk Rows</SubHeading>
              <P>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip. Each row shows a body region, the predicted time until a critical physiological threshold is reached, and a color-coded status badge. The five endpoints are:
              </P>

              <div style={{ margin: '10px 0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  ['Exposed Skin / Frostbite', 'Time until exposed facial skin reaches the freezing threshold for superficial frostbite.'],
                  ['Hands / Frostbite', 'Time until hand skin temperature drops to the critical threshold for finger frostbite.'],
                  ['Feet / Frostbite', 'Time until foot skin temperature drops to the critical threshold for toe frostbite.'],
                  ['Body / Hypothermia', 'Time until core temperature falls below 34 °C, indicating clinical hypothermia onset.'],
                  ['Comfort (until sweating)', 'Time until metabolic heat causes sweating, indicating the ensemble may be too warm for the activity level.'],
                ].map(([label, desc]) => (
                  <div key={label} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: '#f9fafb', border: '0.5px solid var(--border)', borderRadius: 7, fontSize: 12 }}>
                    <strong style={{ color: 'var(--navy)', minWidth: 180, flexShrink: 0 }}>{label}</strong>
                    <span style={{ color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</span>
                  </div>
                ))}
              </div>

              <SubHeading>Status Colours</SubHeading>
              <P>
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos. Rows are colored according to the severity of the predicted risk within the simulation window.
              </P>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 14px' }}>
                {[
                  { label: 'Critical', style: { border: '0.5px solid #fca5a5', background: '#fff5f5', color: '#A32D2D' } },
                  { label: 'Warning', style: { border: '0.5px solid #fcd34d', background: '#fffbeb', color: '#7a5700' } },
                  { label: 'Safe', style: { border: '0.5px solid #bbf7d0', background: '#f0fdf4', color: '#27500A' } },
                  { label: 'Neutral', style: { border: '0.5px solid var(--border)', background: '#f8f9fa', color: 'var(--muted)' } },
                ].map(b => (
                  <div key={b.label} style={{ ...b.style, padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                    {b.label}
                  </div>
                ))}
              </div>

              <PlaceholderFigure label="Figure 5 — Risk Assessment panel with color-coded zone rows" height={150} />
            </section>

            {/* ── Details Plot ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="plot">Details Plot</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. The Details Plot provides a time-series view of the model simulation, allowing users to see how thermal state variables evolve over the full simulation window rather than just the endpoint summary.
              </P>
              <P>
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Click the <strong>Plot</strong> button in the top navigation bar to open this panel. The button is only active once the model has completed an initial calculation.
              </P>

              <PlaceholderFigure label="Figure 6 — Details Plot panel showing time-series thermal variables" height={200} />

              <SubHeading>Interpreting the Traces</SubHeading>
              <P>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </P>
              <Callout type="tip">
                Recalculation is automatic whenever any input changes. Re-open the Details Plot after adjusting parameters to see the updated time-series.
              </Callout>
            </section>

            {/* ── Local Weather Import ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="weather">Local Weather Import</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. The Local Weather Import feature populates the environmental sliders from live OpenWeatherMap data, eliminating the need to manually look up and enter current conditions.
              </P>

              <SubHeading>Searching by Location</SubHeading>
              <P>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem. Enter a city name (e.g. <em>Anchorage</em>) or a latitude/longitude pair (e.g. <em>61.2, −149.9</em>) and press Search. Retrieved values are shown in a preview card before being applied.
              </P>

              <PlaceholderFigure label="Figure 7 — Local Weather modal with search and preview" height={150} />

              <Callout type="info">
                Weather import requires a valid OpenWeatherMap API key configured in your <code style={{ background: '#f3f4f6', border: '0.5px solid var(--border)', borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace' }}>.env</code> file. See the README for setup instructions.
              </Callout>

              <SubHeading>Applied Values</SubHeading>
              <P>
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Imported temperature and wind values are clamped to the model's valid input range (−52 °C to +5 °C, 0–22.4 m/s) before being applied to the sliders. Values outside this range will be clamped at the boundary.
              </P>
            </section>

            {/* ── Units & Settings ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="units">Units &amp; Settings</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. The Settings dropdown in the top navigation bar allows you to switch between SI and Imperial unit systems. All displayed values update immediately; the underlying model always operates in SI units.
              </P>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0' }}>
                {[
                  ['SI', 'Temperature: °C\nWind Speed: m/s'],
                  ['Imperial', 'Temperature: °F\nWind Speed: mph'],
                ].map(([sys, desc]) => (
                  <div key={sys} style={{ background: '#f9fafb', border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>{sys}</div>
                    {desc.split('\n').map(line => (
                      <div key={line} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>{line}</div>
                    ))}
                  </div>
                ))}
              </div>

              <P>
                At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate.
              </P>
            </section>

            {/* ── Methodology ── */}
            <section style={{ marginBottom: 36 }}>
              <SectionHeading id="methodology">Methodology</SectionHeading>
              <P>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. CoWEDA is built on the Predicted Survival Duration Algorithm (PSDA), a validated human thermoregulation model developed for cold-weather risk assessment applications.
              </P>
              <P>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. The PSDA simulates heat exchange between the human body and the environment using a multi-compartment thermal model that accounts for conduction, convection, radiation, and evaporative heat loss.
              </P>

              <SubHeading>Clothing Database</SubHeading>
              <P>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Clothing insulation values are sourced from the CIE (Clothing Insulation Ensemble) database, which contains measured clo values for individual garments and body-zone-specific insulation derived from thermal manikin testing.
              </P>

              <SubHeading>Limitations</SubHeading>
              <P>
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. The model produces estimates based on standardized physiological parameters and should not be used as the sole basis for safety decisions in high-risk environments. Individual variation in thermoregulation, acclimatization state, hydration, fatigue, and other factors are not captured.
              </P>

              <Callout type="warning">
                CoWEDA is a decision-support tool. Risk estimates should be interpreted in conjunction with field experience, established cold-weather operating procedures, and professional judgment.
              </Callout>

              <SubHeading>References</SubHeading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {[
                  'Lorem I, Ipsum D. Predicted survival duration in cold environments. J Thermal Biol. 2019;84:112–121.',
                  'Dolor S, Amet C. clothing insulation database for cold weather risk assessment. ASTM International. 2017.',
                  'Consectetur A, Adipiscing E. Validation of the PSDA thermoregulation model. Arctic Med Res. 2021;58(3):44–58.',
                ].map((ref, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, padding: '8px 12px', background: '#f9fafb', border: '0.5px solid var(--border)', borderRadius: 7 }}>
                    [{i + 1}] {ref}
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
