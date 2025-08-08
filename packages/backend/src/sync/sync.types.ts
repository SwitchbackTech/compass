import { ObjectId } from "mongodb";
import {
  Categories_Recurrence,
  Event_Core,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";

export type Event_Core_WithObjectId = Omit<Event_Core, "_id"> & {
  _id?: ObjectId;
};
export type Summary_Sync = {
  summary: "PROCESSED" | "IGNORED";
  changes: Change_Gcal[];
};

export type Operation_Sync =
  | `${Categories_Recurrence}_${"CREATED" | "UPDATED" | "DELETED"}`
  | "SERIES_CREATED"
  | "ALLDAY_INSTANCES_UPDATED"
  | "TIMED_INSTANCES_UPDATED"
  | "SERIES_DELETED"
  | null;

export type Change_Gcal = {
  title: string;
  transition: [Categories_Recurrence | null, TransitionCategoriesRecurrence];
  category: Categories_Recurrence;
  operation: Operation_Sync;
};
