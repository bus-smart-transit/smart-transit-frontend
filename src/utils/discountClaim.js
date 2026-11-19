// Batch 75 (panel and user, 2026-11-15): a Student, Senior citizen or PWD discount claimed when buying online. The
// passenger pays the full fare; the Chauffeur checks the ID on the bus and, once approved, the discount goes back to
// the e-wallet (the server's DiscountClaimService decides everything; this only builds the request and the wording).

/** One claim key (or null) per ticket of the purchase, for the first `quantity` tickets. */
export function claimKeysFor(quantity, claims = {}, offered = []) {
  const allowed = new Set((offered || []).map((type) => type.key));
  return Array.from({ length: Math.max(1, Number(quantity) || 1) }, (_, index) => {
    const key = claims?.[index];
    return key && allowed.has(key) ? key : null;
  });
}

/** The checkout items, each with its claim when one was chosen. */
export function itemsWithClaims(itemPayload, quantity, claims, offered) {
  return claimKeysFor(quantity, claims, offered).map((key) => (key ? { ...itemPayload, discount_claim_key: key } : { ...itemPayload }));
}

/** "20%" for a type's rate (0.2). */
export const ratePercent = (rate) => `${Math.round(Number(rate) * 100)}%`;

/** The Chauffeur's view of a claim: whether to show the Review button, and the line to show. */
export function claimReviewState(claim) {
  if (!claim) return { reviewable: false, text: '' };
  if (claim.status === 'claimed') return { reviewable: true, text: `${claim.label} discount claimed. Check the valid ID.` };
  if (claim.status === 'approved') return { reviewable: false, text: `${claim.label} discount approved` };
  if (claim.status === 'rejected') return { reviewable: false, text: `${claim.label} discount not approved` };
  return { reviewable: false, text: `${claim.label} discount not reviewed` };
}
