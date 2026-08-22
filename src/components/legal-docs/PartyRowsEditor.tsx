import { Plus, Trash2 } from 'lucide-react';
import { emptyParty, RELATION_TYPE_OPTIONS, type PartyInput } from '@/lib/legalDocSchemas';

const fieldClass =
  'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500';
const labelClass = 'block text-xs font-medium text-gray-600 mb-1';

interface Props {
  label: string;
  parties: PartyInput[];
  onChange: (parties: PartyInput[]) => void;
  addLabel?: string;
  /** Filled in once per document; typed once and reused everywhere it
   * appears in the generated filing (cause title, affidavit, verification)
   * instead of being retyped — the biggest source of the name/address
   * drift seen across hand-typed filings. */
}

export default function PartyRowsEditor({ label, parties, onChange, addLabel }: Props) {
  const update = (index: number, patch: Partial<PartyInput>) => {
    const next = parties.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addRow = () => onChange([...parties, emptyParty()]);
  const removeRow = (index: number) => onChange(parties.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          <Plus className="w-4 h-4" /> {addLabel ?? `Add ${label.replace(/s$/, '')}`}
        </button>
      </div>

      {parties.map((party, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
            {parties.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-gray-400 hover:text-red-600"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                className={fieldClass}
                value={party.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="e.g. Ayesha Asma"
              />
            </div>
            <div>
              <label className={labelClass}>Phone (optional)</label>
              <input
                className={fieldClass}
                value={party.phone}
                onChange={(e) => update(index, { phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Relation</label>
              <select
                className={fieldClass}
                value={party.relation_type}
                onChange={(e) => update(index, { relation_type: e.target.value })}
              >
                <option value="">— none —</option>
                {RELATION_TYPE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Related-to name</label>
              <input
                className={fieldClass}
                value={party.related_to}
                onChange={(e) => update(index, { related_to: e.target.value })}
                placeholder="e.g. Mohammed Azeemuddin"
                disabled={!party.relation_type}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Or free-text relation (for institutions, e.g. "rep. by its Secretary, Ministry of..."; overrides the fields above)
            </label>
            <input
              className={fieldClass}
              value={party.relation_text}
              onChange={(e) => update(index, { relation_text: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Age (optional)</label>
              <input
                className={fieldClass}
                value={party.age}
                onChange={(e) => update(index, { age: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Occupation (optional)</label>
              <input
                className={fieldClass}
                value={party.occupation}
                onChange={(e) => update(index, { occupation: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <textarea
              className={`${fieldClass} h-auto py-2`}
              rows={2}
              value={party.address}
              onChange={(e) => update(index, { address: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
