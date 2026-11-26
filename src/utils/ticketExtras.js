// Batch 76 (user, 2026-11-17): per-ticket choices at checkout besides the discount claim: a priority seat (senior,
// person with disability, pregnant; checked by the Chauffeur on the bus) and baggage in the compartment.
// 2026-11-25 (user): baggage is only declared online; the Chauffeur prices it by size and it is paid in cash on board.

/** The priority a senior or PWD discount claim implies (a claim key that is also a priority type), or ''. */
export function priorityFromClaim(claimKey, priorityTypes = []) {
  return claimKey && (priorityTypes || []).some((type) => type.key === claimKey) ? claimKey : '';
}

/**
 * 2026-11-24 (user): the priority seat after the discount claim changes. A senior or PWD claim sets its own priority
 * (also replacing the other one); any other claim, or none, clears a priority that came from a discount (senior, PWD)
 * but keeps one that has no discount (pregnant).
 */
export function priorityAfterClaim(currentPriority, claimKey, priorityTypes = [], discountTypes = []) {
  const implied = priorityFromClaim(claimKey, priorityTypes);
  if (implied) return implied;
  const fromDiscount = new Set((discountTypes || []).map((type) => type.key));
  return currentPriority && !fromDiscount.has(currentPriority) ? currentPriority : '';
}

/** 2026-11-26 (user): the most pieces of baggage one ticket can declare (the server's BaggageFee::MAX_PIECES). */
export const MAX_BAGGAGE_PIECES = 10;

/** The pieces a choice declares: 0 without baggage, else 1 to MAX_BAGGAGE_PIECES (1 when not given). */
export function baggagePieces(choice) {
  if (!choice?.baggage) return 0;
  const n = Math.trunc(Number(choice.baggage_count));
  return Number.isFinite(n) && n >= 1 ? Math.min(MAX_BAGGAGE_PIECES, n) : 1;
}

/** Each ticket's choices for the first `quantity` tickets: { priority_type, baggage, baggage_count }. */
export function extrasFor(quantity, extras = {}, priorityTypes = []) {
  const allowed = new Set((priorityTypes || []).map((type) => type.key));
  return Array.from({ length: Math.max(1, Number(quantity) || 1) }, (_, index) => {
    const choice = extras?.[index] || {};
    return {
      priority_type: choice.priority_type && allowed.has(choice.priority_type) ? choice.priority_type : null,
      baggage: Boolean(choice.baggage),
      baggage_count: baggagePieces(choice),
    };
  });
}

/** How many pieces of baggage the tickets declare, all together. */
export function baggageCount(quantity, extras) {
  return extrasFor(quantity, extras, []).reduce((sum, choice) => sum + choice.baggage_count, 0);
}

/** Adds each ticket's priority and baggage to the checkout items (built with their discount claims). */
export function itemsWithExtras(items, extras, priorityTypes) {
  const choices = extrasFor(items.length, extras, priorityTypes);
  return items.map((item, index) => {
    const next = { ...item };
    if (choices[index].priority_type) next.priority_type = choices[index].priority_type;
    if (choices[index].baggage) {
      next.baggage = true;
      next.baggage_count = choices[index].baggage_count;
    }
    return next;
  });
}

/**
 * 2026-11-25 (user): what the ticket says about baggage, or '' when none was declared or paid. Baggage is paid in cash
 * on board: `baggage_paid` is what was paid so far (from the server).
 */
export function baggageText(ticket) {
  const paid = Number(ticket?.baggage_paid);
  const pieces = Number(ticket?.baggage_count) > 1 ? `${Number(ticket.baggage_count)}x baggage. ` : '';
  if (Number.isFinite(paid) && paid > 0) return `${pieces}Paid PHP ${paid.toFixed(2)} on board`;
  return ticket?.has_baggage ? `${pieces || 'Declared. '}Pay the Chauffeur in cash on board` : '';
}
