import { ObjectId } from "mongodb";
import { Categories_Recurrence, Event_Core } from "@core/types/event.types";

export type Event_Core_WithObjectId = Omit<Event_Core, "_id"> & {
  _id?: ObjectId;
};
export type Summary_Sync = {
  summary: "PROCESSED" | "IGNORED";
  changes: Change_Gcal[];
};

export type Operation_Sync = "DELETED" | "UPSERTED" | null;
export type Change_Gcal = {
  title: string;
  category: Categories_Recurrence;
  operation: Operation_Sync;
};
