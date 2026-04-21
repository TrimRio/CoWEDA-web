import { ZONE_LABELS, RISK_COLORS } from '../data/constants';
import { itemKey, zonePrimaryClo } from '../hooks/useClothingData';

const ZONE_RISK_INFO = {
  head:       { badge: 'High Risk', status: 'crit' },
  torso_arms: { badge: 'Protected', status: 'ok'   },
  hands:      { badge: 'High Risk', status: 'crit' },
  legs:       { badge: 'Protected', status: 'ok'   },
  feet:       { badge: 'Moderate',  status: 'warn' },
};

/** For torso_arms: "0.40 / 0.30 clo". For all other zones: "0.40 clo". */
function itemCloStr(item, zone) {
  if (zone === 'torso_arms') {
    return `${item.Rcl_torso_clo.toFixed(2)} / ${item.Rcl_arm_clo.toFixed(2)} clo`;
  }
  return `${zonePrimaryClo(item, zone).toFixed(2)} clo`;
}

export default function ClothingModal({ zone, selectedKeys, onToggle, onClose, items = [] }) {
  if (!zone) return null;

  const riskInfo  = ZONE_RISK_INFO[zone] || { badge: '', status: 'neutral' };
  const riskColor = RISK_COLORS[riskInfo.status] || RISK_COLORS.neutral;
  const selected  = selectedKeys || [];

  const totalClo = selected.reduce((sum, key) => {
    const item = items.find(i => itemKey(i) === key);
    return sum + (item ? zonePrimaryClo(item, zone) : 0);
  }, 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560,
        maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="d-flex align-items-center gap-2">
            <span className="modal-zone-title">{ZONE_LABELS[zone]} Clothing</span>
            <span className="modal-zone-badge" style={{ background: riskColor + '22', color: riskColor }}>
              {riskInfo.badge}
            </span>
          </div>
          {zone === 'torso_arms' && (
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>clo shown as torso / arm</span>
          )}
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
          {items.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>No items available for this zone.</div>
          ) : (
            <>
              <div className="field-label mb-2" style={{ fontSize: 11 }}>Available items — click to add/remove</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                {items.map(item => {
                  const key        = itemKey(item);
                  const isSelected = selected.includes(key);
                  return (
                    <div key={key}
                      className={`clothing-card tooltip-wrap ${isSelected ? 'selected' : ''}`}
                      onClick={() => onToggle(zone, key)}>
                      <div className="check-badge">✓</div>
                      <div className="clothing-thumb" style={{ background: '#f0f9ff' }}>
                        <img
                          src={`/clothing/${item.image}`}
                          alt={item.itemDescription}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }}
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 28 }}>🧥</div>
                      </div>
                      <div className="clothing-card-name">{item.itemDescription}</div>
                      <div className="clothing-card-clo">{itemCloStr(item, zone)} · {item.itemWeight_kg} kg</div>
                      <div className="tooltip-content">
                        {item.itemDescription}<br />
                        {itemCloStr(item, zone)} · Layer {item.layer}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selected.length > 0 && (
                <div>
                  <div className="field-label mb-2" style={{ fontSize: 11 }}>
                    Selected ({selected.length} item{selected.length > 1 ? 's' : ''}) — layered bottom to top
                  </div>
                  <div className="d-flex flex-column gap-1">
                    {selected.map(key => {
                      const item = items.find(i => itemKey(i) === key);
                      if (!item) return null;
                      return (
                        <div key={key} className="wear-item">
                          <div style={{
                            width: 32, height: 32, flexShrink: 0,
                            borderRadius: 5, overflow: 'hidden',
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
                            <span style={{ display: 'none', fontSize: 16, lineHeight: 1 }}>🧥</span>
                          </div>
                          <span className="wear-item-name flex-grow-1">{item.itemDescription}</span>
                          <span className="wear-item-clo me-2">{itemCloStr(item, zone)}</span>
                          <button className="remove-btn" onClick={() => onToggle(zone, key)}>✕</button>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: 11, color: 'var(--muted)', paddingLeft: 2, marginTop: 4 }}>
                      Total: {totalClo.toFixed(2)} clo
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '0.5px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-sm btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
