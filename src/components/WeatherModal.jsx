import { useState } from 'react';

const OWM_KEY = import.meta.env.VITE_OWM_KEY;

// Detect if input looks like "lat, lon" (e.g. "42.3, -71.1" or "42.3601 -71.0589")
function parseLatLon(input) {
  const clean = input.trim().replace(/\s*,\s*/, ' ');
  const parts  = clean.split(/\s+/);
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }
  return null;
}

export default function WeatherModal({ onApply, onClose }) {
  const [query,   setQuery]   = useState('');
  const [status,  setStatus]  = useState(null);   // null | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(null);   // { locationName, temp, humidity, wind }

  if (!OWM_KEY) {
    return (
      <div style={backdropStyle} onClick={onClose}>
        <div style={panelStyle} onClick={e => e.stopPropagation()}>
          <ModalHeader onClose={onClose} />
          <div style={{ padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#A32D2D', marginBottom: 6 }}>
              API key not configured
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              Add <code style={codeStyle}>VITE_OWM_KEY=your_key</code> to your <code style={codeStyle}>.env</code> file
              and restart the dev server.
            </div>
          </div>
        </div>
      </div>
    );
  }

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setStatus('loading');
    setMessage('');
    setPreview(null);

    try {
      let weatherUrl;
      const coords = parseLatLon(trimmed);

      if (coords) {
        // Direct lat/lon query
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${OWM_KEY}&units=metric`;
      } else {
        // City name query
        weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(trimmed)}&appid=${OWM_KEY}&units=metric`;
      }

      const res  = await fetch(weatherUrl);
      const data = await res.json();

      if (!res.ok) {
        const msg = data.message
          ? data.message.charAt(0).toUpperCase() + data.message.slice(1)
          : 'Unknown error from OpenWeatherMap.';
        setStatus('error');
        setMessage(msg);
        return;
      }

      const temp     = Math.round(data.main.temp * 10) / 10;
      const humidity = Math.round(data.main.humidity);
      const wind     = Math.round(data.wind.speed * 10) / 10;
      const city     = data.name;
      const country  = data.sys?.country ?? '';

      setPreview({
        locationName: country ? `${city}, ${country}` : city,
        temp,
        humidity,
        wind,
      });
      setStatus('success');

    } catch {
      setStatus('error');
      setMessage('Network error — check your connection.');
    }
  }

  function handleApply() {
    if (!preview) return;
    onApply({ temp: preview.temp, humidity: preview.humidity, wind: preview.wind });
    onClose();
  }

  const canSearch = query.trim().length > 0 && status !== 'loading';

  return (
    <div style={backdropStyle} onClick={onClose}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <ModalHeader onClose={onClose} />

        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5 }}>
            Enter a city name or latitude / longitude pair.
          </div>

          {/* Search row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              className="form-control form-control-sm"
              style={{ fontSize: 13, flex: 1 }}
              placeholder='e.g.  "Anchorage"  or  "61.2, -149.9"'
              value={query}
              onChange={e => { setQuery(e.target.value); setStatus(null); setPreview(null); }}
              onKeyDown={e => e.key === 'Enter' && canSearch && handleSearch()}
            />
            <button
              className="btn btn-sm btn-primary"
              style={{ whiteSpace: 'nowrap', minWidth: 70 }}
              disabled={!canSearch}
              onClick={handleSearch}
            >
              {status === 'loading' ? (
                <span className="spinner-border spinner-border-sm" role="status" />
              ) : 'Search'}
            </button>
          </div>

          {/* Error */}
          {status === 'error' && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#A32D2D', background: '#fff5f5', border: '0.5px solid #fca5a5', borderRadius: 7, padding: '8px 12px' }}>
              {message}
            </div>
          )}

          {/* Preview card */}
          {status === 'success' && preview && (
            <div style={{ marginTop: 12, background: '#f0f9ff', border: '0.5px solid #bae6fd', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>
                📍 {preview.locationName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <WeatherStat label="Temperature" value={`${preview.temp} °C`} />
                <WeatherStat label="Humidity"    value={`${preview.humidity} %`} />
                <WeatherStat label="Wind Speed"  value={`${preview.wind} m/s`} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                These values will replace the current Environmental Parameters sliders.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', marginTop: 16, borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-sm btn-primary"
            disabled={!preview}
            onClick={handleApply}
          >
            Apply to Sliders
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ onClose }) {
  return (
    <div style={{ padding: '14px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)' }}>🌤 Import Local Weather</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1 }}>✕</button>
    </div>
  );
}

function WeatherStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', background: '#fff', borderRadius: 7, padding: '8px 4px', border: '0.5px solid #bae6fd' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{value}</div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const backdropStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};

const panelStyle = {
  background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440,
  overflow: 'hidden', display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
};

const codeStyle = {
  background: '#f3f4f6', border: '0.5px solid var(--border)',
  borderRadius: 4, padding: '1px 5px', fontSize: 11, fontFamily: 'monospace',
};
