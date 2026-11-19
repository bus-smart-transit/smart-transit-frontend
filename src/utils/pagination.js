// Batch 46 (shared with Batch 48): the footer text of a paged list.

/** "Showing 1 to 10 of 23"; "Showing 0 of 0" when the list is empty. */
export function pageSummary({ page, perPage, total }) {
  if (!total) return 'Showing 0 of 0';
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return `Showing ${from} to ${to} of ${total}`;
}
