import * as sse from "@core/constants/sse.constants";

export enum Sync_AsyncStateContextReason {
  EVENT_CHANGED = sse.EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED = sse.SOMEDAY_EVENT_CHANGED,
  IMPORT_COMPLETE = "IMPORT_COMPLETE",
  GOOGLE_REVOKED = sse.GOOGLE_REVOKED,
}
