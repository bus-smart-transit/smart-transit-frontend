import { FILE_TYPES } from '../../../utils/tableExport';

/** 2026-11-08 (advisor, user): the file type a report downloads as, PDF or CSV. */
export default function FileTypeSelect({ value, onChange, id = 'file-type', className = '' }) {
  return (
    <label htmlFor={id} className={`inline-flex items-center gap-2 text-xs font-medium text-slate-600 ${className}`}>
      File type
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
      >
        {FILE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
      </select>
    </label>
  );
}
