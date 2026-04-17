import { useState } from 'react';
import { DEFAULT_ENSEMBLE_NAMES } from '../data/ensembles';

export default function EnsembleControls({ ensembles, selected, onSelect, onSave, onDelete, onSaveNew }) {
  const [mode, setMode]   = useState(null);   // null | 'rename' | 'new'
  const [name, setName]   = useState('');

  const isDefault = DEFAULT_ENSEMBLE_NAMES.includes(selected);

  function startRename()  { setName(selected); setMode('rename'); }
  function startNew()     { setName('');        setMode('new');    }
  function cancel()       { setMode(null); }

  function commit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === 'rename') onSave(trimmed);
    if (mode === 'new')    onSaveNew(trimmed);
    setMode(null);
  }

  if (mode) {
    return (
      <div className="mb-3 pb-3 border-bottom">
        <div className="field-label mb-1">
          {mode === 'rename' ? 'Rename ensemble' : 'Save current clothing as…'}
        </div>
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm flex-grow-1"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commit()}
            autoFocus
            placeholder="Ensemble name…"
          />
          <button className="btn btn-sm btn-primary" onClick={commit}>Save</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={cancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3 pb-3 border-bottom">
      <div className="d-flex gap-2 align-items-center">
        <select
          className="form-select form-select-sm flex-grow-1"
          value={selected}
          onChange={e => onSelect(e.target.value)}
        >
          {ensembles.map(e => <option key={e}>{e}</option>)}
        </select>
        <button
          className="btn btn-sm btn-primary"
          title="Save current clothing as a new ensemble"
          onClick={startNew}
        >
          + Save new
        </button>
      </div>

      {/* Rename / Delete — only for user-created ensembles */}
      {!isDefault && (
        <div className="d-flex gap-2 mt-2">
          <button className="btn btn-sm btn-outline-secondary" style={{ fontSize: 11 }} onClick={startRename}>
            Rename
          </button>
          <button className="btn-danger-soft" style={{ fontSize: 11 }} onClick={onDelete}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
