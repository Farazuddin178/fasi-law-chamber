import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  /** Numbered so the generated filing's numbering (1., 2., 3. ...) is
   * produced automatically — nothing hand-numbered to get out of sync. */
}

export default function ParagraphListEditor({ label, items, onChange, placeholder, addLabel }: Props) {
  const update = (index: number, value: string) => {
    const next = items.slice();
    next[index] = value;
    onChange(next);
  };

  const addItem = () => onChange([...items, '']);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = items.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          <Plus className="w-4 h-4" /> {addLabel ?? 'Add paragraph'}
        </button>
      </div>

      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <span className="mt-2 w-6 shrink-0 text-sm font-semibold text-gray-500">{index + 1}.</span>
          <textarea
            className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            rows={2}
            value={item}
            placeholder={placeholder}
            onChange={(e) => update(index, e.target.value)}
          />
          <div className="flex flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === items.length - 1}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="mt-2 shrink-0 text-gray-400 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
