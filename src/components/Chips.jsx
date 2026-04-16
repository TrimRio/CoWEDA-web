export default function Chips({ options, value, onChange }) {
  return (
    <div className="d-flex gap-1 flex-wrap justify-content-center">
      {options.map(o => (
        <span
          key={o}
          className={`chip ${value === o ? 'active' : ''}`}
          onClick={() => onChange(o)}
        >
          {o}
        </span>
      ))}
    </div>
  );
}
