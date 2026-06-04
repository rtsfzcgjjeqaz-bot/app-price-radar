interface Props {
  categories: string[];
  selected: string;
  onChange: (cat: string) => void;
}

export default function FilterBar({ categories, selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {['All', ...categories].map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
