// Every number the answer pipeline reads, and nothing else (spec 06, cookbook pattern).
// Values are the spec's starting points, from the TypeSafe cookbooks (classifying_rag_passages, semantic_find,
// citation_check). Not yet tuned by the eval harness; Jev model observed: jev-1.13.0 (25 Sep 2026).
export const THRESHOLDS = {
  /** Initiative Choice confidence at or above which Friction routes without offering a switch. */
  initiativeRoute: 0.8,
  /** Below this, Friction asks the employee which initiative it is. Between the two: route, switchable. */
  initiativeSwitchable: 0.5,
  /** The chosen initiative's own "is it about this?" Noul must reach this, or Friction asks. */
  aboutGuard: 0.3,
  /** Coverage Noul strictly below this shows the provisional "probably not covered" line. */
  provisionalCovered: 0.1,

  /** routePassage, first match wins: injection, contradicts, not relevant, evidence. */
  injection: 0.7,
  contradicts: 0.7,
  relevantMin: 0.45,
  evidenceInclude: 0.55,
  /** decideBand: an include passage this strong makes the answered band; all under the floor, unanswerable. */
  answeredBand: 0.7,
  unanswerableBand: 0.3,

  /** Middle band: every cited claim must be "supports" at this confidence (cookbook AUTO_ACCEPT). */
  citationAutoAccept: 0.8,
  /** Middle band: an uncited text block longer than this means Claude said something it could not cite. */
  uncitedMaxChars: 60,

  /** "N others": cosine between event embeddings, and how far back to look. */
  othersCosine: 0.82,
  othersWindowDays: 30,

  /** Retrieval: candidates per arm per initiative, passages kept per initiative after fusion, RRF k. */
  retrieveTopK: 20,
  keepPerInitiative: 12,
  rrfK: 60,
  /** Passages handed to Claude. */
  claudePassages: 6,
  /** Passages shown when Claude is unavailable but the docs clearly cover it. */
  fallbackPassages: 2,
} as const;

/** Per-step timeouts and the whole-answer deadline, in milliseconds (spec 06, latency budget). */
export const BUDGET = {
  context: 1000,
  embed: 1000,
  retrieve: 1000,
  jev: 1500,
  rewrite: 1500,
  claudeFirstToken: 2500,
  claudeTotal: 4000,
  others: 1000,
  deadline: 6000,
  /** A re-POST of an event whose first run started less than this ago answers 409 in_progress. */
  inProgressWindow: 30_000,
} as const;
