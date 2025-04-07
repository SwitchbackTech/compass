import { Category_Event } from "@core/types/event.types";

export type Summary_Sync = {
  summary: "PROCESSED" | "IGNORED";
  changes: Change_Gcal[];
};

export type Operation_Sync = "CANCELLED" | "UPSERTED" | null;
export type Change_Gcal = {
  title: string;
  category: Category_Event;
  operation: Operation_Sync;
};
