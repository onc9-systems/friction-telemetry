// The analysis seam: flows 13 (clustering), 14 (thesis scoring and insights), 15 (Q&A drafting), 16 (health).
// Phases 01 to 08 call it; phase 09 supplies the real implementation. Until then every call is a no-op.
import type * as z from "zod";
import type { EVENT_CATALOG } from "@friction-telemetry/contracts";

export type EventAnswered = z.infer<(typeof EVENT_CATALOG)["ft/event.answered"]>;
export type InitiativeScope = { organizationId: string; initiativeId: string };

export interface AnalysisSeam {
  /** A flag or question got its answer and resolution class (flow 8 hands off to flow 13). */
  onEventAnswered(event: EventAnswered): Promise<void>;
  /** Regroup the initiative's flags and questions into clusters (flow 13). */
  recluster(scope: InitiativeScope): Promise<void>;
  /** Turn clusters into insights tied to the theses they support or break (flow 14). */
  scoreInsights(scope: InitiativeScope): Promise<void>;
  /** Draft canonical Q&A entries from clusters of questions (flow 15). */
  draftQA(scope: InitiativeScope): Promise<void>;
  /** Recompute the initiative's health, keeping every component (flow 16). */
  computeHealth(scope: InitiativeScope): Promise<void>;
}

/** The shell's implementation: accepts every call and does nothing. */
export class NoopAnalysis implements AnalysisSeam {
  async onEventAnswered(_event: EventAnswered): Promise<void> {}
  async recluster(_scope: InitiativeScope): Promise<void> {}
  async scoreInsights(_scope: InitiativeScope): Promise<void> {}
  async draftQA(_scope: InitiativeScope): Promise<void> {}
  async computeHealth(_scope: InitiativeScope): Promise<void> {}
}
