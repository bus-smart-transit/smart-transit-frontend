import { User } from 'lucide-react';
import Card from '../ui/Card';

/** The default avatar (no photo upload), the name, the email and the role. */
export default function ProfileOverview({ view }) {
  return (
    <Card as="section" aria-labelledby="profile-overview-title" padding="md" data-testid="profile-overview">
      <div className="flex items-center gap-4">
        <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
          <User size={32} />
        </span>
        <div className="min-w-0">
          <h2 id="profile-overview-title" className="truncate font-display text-lg font-bold text-navy-950">{view.name || view.roleLabel}</h2>
          {view.email && <p className="truncate text-sm text-slate-500">{view.email}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span data-testid="profile-role" className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{view.roleLabel}</span>
            {view.createdOn && <span className="text-slate-500">Account created {view.createdOn}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
