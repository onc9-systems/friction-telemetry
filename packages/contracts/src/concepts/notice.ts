import * as z from "zod";
import { NOTICE_KIND } from "../enums";
import { AuthId, Id, Instant } from "../primitives";

export const NoticeKind = z.enum(NOTICE_KIND);
export type NoticeKind = z.infer<typeof NoticeKind>;

export const Notice = z.object({
  id: Id,
  userId: AuthId,
  kind: NoticeKind,
  /** The Fix or QAEntry this notice is about. */
  refId: Id,
  title: z.string().min(1),
  body: z.string(),
  createdAt: Instant,
  readAt: Instant.nullable(),
});
export type Notice = z.infer<typeof Notice>;
