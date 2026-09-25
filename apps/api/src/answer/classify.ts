// The decisions of the answer pipeline, as pure functions of Jev's probabilities and THRESHOLDS.
// The resolution class comes from here and never from Claude (brief, Shared Decisions).
import { THRESHOLDS as T } from "./thresholds";

export type InitiativeOption = { initiativeId: string; name: string; slug: string };

export type InitiativeDecision =
  | { kind: "route"; initiativeId: string; confidence: number; switchable: boolean; alternatives: InitiativeOption[] }
  | { kind: "choose"; options: InitiativeOption[] };

/**
 * Which initiative an event belongs to. An explicit pick or a single live initiative routes at once. Otherwise
 * the Choice decides, guarded by the chosen initiative's own Noul (a Choice always picks someone, a Noul can
 * say "none of these").
 */
export function decideInitiative(input: {
  live: InitiativeOption[];
  explicitId: string | null;
  choice: { slug: string; confidence: number } | null;
  about: Record<string, number> | null;
}): InitiativeDecision {
  const { live, explicitId, choice, about } = input;
  if (explicitId) return { kind: "route", initiativeId: explicitId, confidence: 1, switchable: false, alternatives: [] };
  if (live.length === 1) return { kind: "route", initiativeId: live[0]!.initiativeId, confidence: 1, switchable: false, alternatives: [] };
  const chosen = choice ? live.find((o) => o.slug === choice.slug) : undefined;
  const guard = chosen && about ? (about[chosen.slug] ?? 0) : 0;
  if (!chosen || !choice || guard < T.aboutGuard || choice.confidence < T.initiativeSwitchable) {
    return { kind: "choose", options: live };
  }
  const switchable = choice.confidence < T.initiativeRoute;
  return {
    kind: "route",
    initiativeId: chosen.initiativeId,
    confidence: choice.confidence,
    switchable,
    alternatives: switchable ? live.filter((o) => o !== chosen) : [],
  };
}

export const shouldShowProvisional = (covered: number | null) => covered !== null && covered < T.provisionalCovered;

export type PassageScores = { relevant: number; evidence: number; contradicts: number; injection: number };
export type PassageRoute = "injection" | "conflict" | "include" | "exclude";

/** Cookbook order, first match wins: an injection attempt is excluded however well it seems to answer. */
export function routePassage(s: PassageScores): PassageRoute {
  if (s.injection > T.injection) return "injection";
  if (s.contradicts > T.contradicts) return "conflict";
  if (s.relevant < T.relevantMin) return "exclude";
  if (s.evidence > T.evidenceInclude) return "include";
  return "exclude";
}

export type Band = "answered" | "middle" | "unanswerable";

export function decideBand(passages: Array<{ route: PassageRoute; evidence: number }>): Band {
  if (passages.some((p) => p.route === "include" && p.evidence >= T.answeredBand)) return "answered";
  if (passages.every((p) => p.evidence < T.unanswerableBand) && !passages.some((p) => p.route === "conflict")) return "unanswerable";
  return "middle";
}

export type Claim = { text: string; cited: boolean; check: { choice: string; confidence: number } | null };

/** Middle band: an answer is shown only when every cited claim is verified and nothing sizeable is uncited. */
export function decideAfterCheck(claims: Claim[]): boolean {
  const cited = claims.filter((c) => c.cited);
  if (cited.length === 0) return false;
  if (claims.some((c) => !c.cited && c.text.trim().length > T.uncitedMaxChars)) return false;
  return cited.every((c) => c.check?.choice === "supports" && c.check.confidence >= T.citationAutoAccept);
}

/** Reciprocal rank fusion (k = 60) over ranked lists of keys. Ranks are 1-based. Highest score first. */
export function fuseRrf(lists: string[][], k: number = T.rrfK): Array<{ key: string; score: number }> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((key, i) => scores.set(key, (scores.get(key) ?? 0) + 1 / (k + i + 1)));
  }
  return [...scores].map(([key, score]) => ({ key, score })).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

/** Readable, unique Jev slugs for initiative names ("Procurement rollout" becomes procurement_rollout). */
export function slugify(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "initiative";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
}
