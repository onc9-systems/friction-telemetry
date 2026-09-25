import * as z from "zod";

/** Domain ids are UUIDs. Flag and Question ids are generated on the Mac and double as idempotency keys. */
export const Id = z.uuid();

/** Ids that come from the auth system (organizations, users). better-auth ids are text, not UUIDs. */
export const AuthId = z.string().min(1);

/** ISO 8601 timestamp with an offset (`Z` or `+04:00`), any sub-second precision. */
export const Instant = z.iso.datetime({ offset: true });

/** Calendar date without a time (`2026-10-31`). */
export const CalendarDate = z.iso.date();
