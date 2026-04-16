export default function Slider({ label, min, max, value, onChange, unit, trackStyle }) {
  return (
    <div className="mb-2">
      <div className="field-label">{label}</div>
      <div className="d-flex align-items-center gap-2">
        <div className="slider-wrap flex-grow-1">
          <div className="slider-track" style={trackStyle}></div>
          <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
          />
        </div>
        <span className="field-val">{value}</span>
        <span className="field-unit">{unit}</span>
      </div>
    </div>
  );
}
