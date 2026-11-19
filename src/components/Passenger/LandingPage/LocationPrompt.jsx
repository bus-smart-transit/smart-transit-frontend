import { Loader2, MapPin } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';

/**
 * Batch 53 item 4 (user, 2026-11-10): "Are you in {place}?" as a pop-up. `phase`: 'locating' (finding where you are),
 * 'question', 'checking' (looking for trips after Yes) or 'none' (no trips in your area today, with Show all trips).
 * Renders only; LandingHero runs it with useHomeLocation.
 */
export default function LocationPrompt({ phase, question, place, onYes, onNo, onShowAll, onClose }) {
  const open = Boolean(phase);
  const busy = phase === 'locating' || phase === 'checking';
  return (
    <Modal open={open} onClose={onClose} title={phase === 'none' ? 'No trips near you today' : 'Your location'} size="sm">
      <div className="space-y-4 text-center" data-testid="location-prompt">
        {busy ? (
          <div className="flex flex-col items-center gap-3 py-4" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" aria-hidden="true" />
            <p className="text-sm text-slate-600">{phase === 'locating' ? 'Finding where you are...' : `Looking for trips from ${place || 'your area'}...`}</p>
          </div>
        ) : phase === 'none' ? (
          <>
            <p className="text-sm text-slate-600">There are no trips you can board in {place || 'your area'} today.</p>
            <Button type="button" variant="primary" onClick={onShowAll} className="w-full">Show all trips</Button>
          </>
        ) : (
          <>
            <MapPin className="mx-auto h-8 w-8 text-teal-600" aria-hidden="true" />
            <p className="font-display text-lg font-semibold text-navy-950" data-testid="location-question">{question}</p>
            <div className="flex justify-center gap-2">
              <Button type="button" variant="primary" onClick={onYes}>Yes</Button>
              <Button type="button" variant="secondary" onClick={onNo}>No</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
