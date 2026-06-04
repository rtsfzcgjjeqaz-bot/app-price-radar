interface Option {
  label: string;
  value: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

export default function SortSelect({ options, value, onChange, label }: Props) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-500">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
