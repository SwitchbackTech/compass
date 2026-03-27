import { type ObjectId } from "mongodb";
import { z } from "zod/v4";
import {
  type Categories_Recurrence,
  type Event_Core,
  type TransitionCategoriesRecurrence,
} from "@core/types/event.types";

export type Event_Core_WithObjectId = Omit<Event_Core, "_id"> & {
  _id?: ObjectId;
};

export type Event_Transition = {
  title: string;
  transition: [Categories_Recurrence | null, TransitionCategoriesRecurrence];
  category: Categories_Recurrence;
  operation: Operation_Sync;
};

export type Summary_Sync = {
  summary: "PROCESSED" | "IGNORED";
  changes: Event_Transition[];
};

export type Operation_Sync =
  | `${Categories_Recurrence}_${"CREATED" | "UPDATED" | "DELETED"}`
  | "SERIES_CREATED"
  | "ALLDAY_INSTANCES_UPDATED"
  | "TIMED_INSTANCES_UPDATED"
  | "SERIES_DELETED"
  | null;

export const ImportGCalRequestSchema = z.object({
  force: z.boolean().optional(),
});
