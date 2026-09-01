// The status vocabulary — the single declaration every reader of a status cell imports.
//
// This file exists to close one specific defect: on the platform this checker was ported
// from, `board-check.mjs` and the cockpit renderer each declared their own copy of the list
// below, and only the cockpit resolved the aliases — so a board cell reading `open` or
// `needs product-check` rendered fine in the cockpit and FAILED the checker. Two readers of
// the same board disagreed about what a status IS. See scripts/OBSERVED-DEFECTS.md (rule 4)
// for the full shape of that defect.
//
// The fix is structural, not a bigger list: there is now exactly one file that knows what a
// status is and what its synonyms mean. `scripts/board-check.mjs` imports it. `cockpit/
// generate.mjs` imports it too (once the cockpit is rebuilt — see epic-02 story 02.4). Neither
// file may declare its own `STATUS_VOCAB` or `STATUS_ALIAS` array — grep for a second
// declaration under scripts/ or cockpit/ should always come back empty.
//
// Order matters: `raised` precedes `planned` — a story filed by `product-check` but not yet
// through `tech-planning` is earlier in the lifecycle than a merely-planned one, and anything
// that renders the vocabulary as an ordered list (docs, cockpit legends) should read it in
// this order rather than re-deriving one.

export const STATUS_VOCAB = ['raised', 'planned', 'in-progress', 'in-qa', 'done', 'blocked', 'deferred'];

// A project's board may carry either of these in place of the canonical token; both resolve
// to their mapped value everywhere a status is checked, counted, or rendered.
export const STATUS_ALIAS = { open: 'in-progress', 'needs product-check': 'raised' };

/** A raw status token, resolved through the alias map if it names one, unchanged otherwise. */
export const resolveStatus = (raw) => STATUS_ALIAS[raw] ?? raw;
