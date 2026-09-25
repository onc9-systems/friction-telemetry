import * as z from "zod";
import { Workspace } from "./concepts/workspace";
import { Initiative, InitiativeMember } from "./concepts/initiative";
import { Thesis } from "./concepts/thesis";
import { Document, DocumentVersion, Passage } from "./concepts/document";
import { Flag } from "./concepts/flag";
import { FlagCaptureDetail, FlagCaptureManifest } from "./concepts/flag-capture";
import { Question } from "./concepts/question";
import { Answer } from "./concepts/answer";
import { QAEntry } from "./concepts/qa-entry";
import { Cluster } from "./concepts/cluster";
import { Insight, InsightEvidence } from "./concepts/insight";
import { Fix } from "./concepts/fix";
import { Health } from "./concepts/health";
import { Notice } from "./concepts/notice";
import { MyRecordItem } from "./concepts/my-record";
import { ScriptStep } from "./sse";

/**
 * Every file in `fixtures/` and the schema it must satisfy. The TypeScript tests, the Swift drift test,
 * the database seed, and the Mac app's sample data all read these same files.
 */
export const FIXTURES = {
  "workspace.json": Workspace,
  "initiatives.json": z.array(Initiative),
  "initiative-members.json": z.array(InitiativeMember),
  "theses.json": z.array(Thesis),
  "documents.json": z.array(Document),
  "document-versions.json": z.array(DocumentVersion),
  "passages.json": z.array(Passage),
  "flags.json": z.array(Flag),
  "flag-capture-manifest.json": FlagCaptureManifest,
  "flag-capture-detail.json": FlagCaptureDetail,
  "questions.json": z.array(Question),
  "answers.json": z.array(Answer),
  "my-record.json": z.array(MyRecordItem),
  "qa-entries.json": z.array(QAEntry),
  "clusters.json": z.array(Cluster),
  "insights.json": z.array(Insight),
  "insight-evidence.json": z.array(InsightEvidence),
  "fixes.json": z.array(Fix),
  "health.json": z.array(Health),
  "notices.json": z.array(Notice),
  "stub-answered.json": z.array(ScriptStep),
  "stub-provisional-routed.json": z.array(ScriptStep),
} as const;

export type FixtureName = keyof typeof FIXTURES;
