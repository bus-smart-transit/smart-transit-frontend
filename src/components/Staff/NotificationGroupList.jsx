import { useState } from 'react';
import { groupTitle } from '../../utils/notificationGroups';

/**
 * 2026-10-27: the bell's list, one card per group of the same kind (utils/notificationGroups). A group shows its
 * newest message; "Show all N" opens every message in it, each still openable on its own. "Mark N read" marks the
 * whole group in one request. A group of one looks like a single notification did before.
 *
 * `fields`: { id(n), text(n) }. `renderItemExtra(n)`: optional extra under a message (the Driver and Chauffeur
 * "Open trip" link). `itemProps(n)`: optional props that make a message clickable.
 */
export default function NotificationGroupList({ groups, fields, onMarkRead, renderItemExtra = null, itemProps = null }) {
  const [openKey, setOpenKey] = useState(null);

  return groups.map((group) => {
    const tone = group.unread ? 'border-amber-200 bg-amber-50 text-slate-800' : 'border-slate-100 bg-slate-50 text-slate-500';
    const expanded = openKey === group.key;
    const shown = expanded ? group.items : group.items.slice(0, 1);
    return (
      <div key={group.key} data-testid="notification-group" data-count={group.count} className={`rounded-lg border px-3 py-2.5 text-sm ${tone}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{groupTitle(group)}</p>
          {group.unread && (
            <button
              type="button"
              onClick={() => onMarkRead(group.ids)}
              className="shrink-0 text-xs font-semibold text-teal-600 hover:underline"
            >
              {group.count > 1 ? `Mark ${group.count} read` : 'Mark read'}
            </button>
          )}
        </div>
        <ul className="mt-1 space-y-1.5">
          {shown.map((n) => {
            const props = itemProps ? itemProps(n) : {};
            return (
              <li
                key={fields.id(n)}
                data-testid="notification-item"
                data-clickable={props.onClick ? 'true' : 'false'}
                className={`text-xs ${props.onClick ? 'cursor-pointer rounded hover:text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-300' : ''}`}
                {...props}
              >
                <p>{fields.text(n)}</p>
                {renderItemExtra?.(n)}
              </li>
            );
          })}
        </ul>
        {group.count > 1 && (
          <button
            type="button"
            onClick={() => setOpenKey(expanded ? null : group.key)}
            aria-expanded={expanded}
            className="mt-1.5 text-xs font-semibold text-slate-600 underline"
          >
            {expanded ? 'Show less' : `Show all ${group.count}`}
          </button>
        )}
      </div>
    );
  });
}
