// Batch 76 (user, 2026-11-17): per-ticket choices at checkout besides the discount claim: a priority seat (senior,
// person with disability, pregnant; checked by the Chauffeur on the bus) and baggage in the compartment, which costs
// a share of the ticket's full fare (the server's BaggageFee owns the amount; this only mirrors it for the summary).

/** The baggage fee for one ticket: `percent` of the full fare, whole pesos (fare 100 at 50 percent: 50). */
export function baggageFeeFor(fare, percent) {
  const amount = Number(fare);
  const rate = Number(percent);
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || amount <= 0 || rate <= 0) return 0;
  return Math.round((amount * rate) / 100);
}

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

/** Each ticket's choices for the first `quantity` tickets: { priority_type, baggage }. */
export function extrasFor(quantity, extras = {}, priorityTypes = []) {
  const allowed = new Set((priorityTypes || []).map((type) => type.key));
  return Array.from({ length: Math.max(1, Number(quantity) || 1) }, (_, index) => {
    const choice = extras?.[index] || {};
    return {
      priority_type: choice.priority_type && allowed.has(choice.priority_type) ? choice.priority_type : null,
      baggage: Boolean(choice.baggage),
    };
  });
}

/** How many tickets carry baggage, and the total baggage fee for a fare. */
export function baggageSummary(fare, quantity, extras, percent) {
  const count = extrasFor(quantity, extras, []).filter((choice) => choice.baggage).length;
  return { count, total: count * baggageFeeFor(fare, percent) };
}

/** Adds each ticket's priority and baggage to the checkout items (built with their discount claims). */
export function itemsWithExtras(items, extras, priorityTypes) {
  const choices = extrasFor(items.length, extras, priorityTypes);
  return items.map((item, index) => {
    const next = { ...item };
    if (choices[index].priority_type) next.priority_type = choices[index].priority_type;
    if (choices[index].baggage) next.baggage = true;
    return next;
  });
}
