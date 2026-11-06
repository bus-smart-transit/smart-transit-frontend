import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import { usePlaceSearch } from '../../../api/hooks/Staff/usePlaceSearch';

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500';

/**
 * 2026-11-06 (Batch 47 part A): find a place to move the map and the pin to. Suggestions show while typing; each has
 * a name and a detail line so places with the same name can be told apart. Arrow keys move through the list, Enter
 * picks; Enter with no suggestion chosen runs Search. onPick({ name, detail, latitude, longitude }).
 */
export default function PlaceSearch({ onPick }) {
  const { query, setQuery, results, loading, message, search, clear } = usePlaceSearch();
  const [active, setActive] = useState(-1);
  const listId = useId();
  const showList = results.length > 0;

  const pick = (place) => {
    onPick(place);
    setQuery(place.detail ? `${place.name}, ${place.detail}` : place.name);
    clear();
    setActive(-1);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown' && showList) {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp' && showList) {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (showList && active >= 0) {
        pick(results[active]);
      } else {
        search();
      }
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault();
      clear();
      setActive(-1);
    }
  };

  return (
    <div className="relative">
      <span className="block text-xs font-medium text-slate-600" id={`${listId}-label`}>Find a place</span>
      <div className="mt-1 flex gap-2">
        <input
          type="search"
          role="combobox"
          aria-labelledby={`${listId}-label`}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(-1); }}
          onKeyDown={onKeyDown}
          placeholder="Street, landmark or barangay"
          className={INPUT}
        />
        <button type="button" onClick={search} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Search className="h-3.5 w-3.5" aria-hidden="true" /> Search
        </button>
      </div>
      {showList && (
        <ul id={listId} role="listbox" aria-label="Places found" className="absolute inset-x-0 z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.map((place, index) => (
            <li
              key={`${place.name}|${place.detail}|${place.latitude}|${place.longitude}`}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => { event.preventDefault(); pick(place); }}
              className={`cursor-pointer px-3 py-2 text-sm ${index === active ? 'bg-teal-50' : 'hover:bg-slate-50'}`}
            >
              <span className="block font-medium text-slate-900">{place.name}</span>
              {place.detail && <span className="block text-xs text-slate-500">{place.detail}</span>}
            </li>
          ))}
        </ul>
      )}
      {loading && <p className="mt-1 text-xs text-slate-500" role="status">Looking for places...</p>}
      {!loading && message && <p className="mt-1 text-xs text-slate-500" role="status">{message}</p>}
    </div>
  );
}
