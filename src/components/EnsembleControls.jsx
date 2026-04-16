import { useState } from 'react';

export default function EnsembleControls({ ensembles, selected, onSelect, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState('');

  function startEdit() { setName(selected); setEditing(true); }
  function cancel()    { setEditing(false); }
  function save()      { if (name.trim()) { onSave(name.trim()); setEditing(false); } }

  if (editing) {
    return (
      <div className="mb-3 pb-3 border-bottom">
        <div className="field-label mb-1">Ensemble name</div>
        <div className="d-flex gap-2">
          <input
            className="form-control form-control-sm flex-grow-1"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
            placeholder="Ensemble name…"
          />
          <button className="btn btn-sm btn-primary" onClick={save}>Save</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={cancel}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex gap-2 align-items-center mb-3 pb-3 border-bottom">
      <select
        className="form-select form-select-sm flex-grow-1"
        value={selected}
        onChange={e => onSelect(e.target.value)}
      >
        {ensembles.map(e => <option key={e}>{e}</option>)}
      </select>
      <button className="btn btn-sm btn-outline-primary" onClick={startEdit}>Edit name</button>
      <button className="btn-danger-soft" onClick={onDelete}>Delete</button>
    </div>
  );
}
