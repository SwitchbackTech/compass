import {
  Categories_Recurrence,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";

export type Summary_Sync = {
  summary: "PROCESSED" | "IGNORED";
  changes: Event_Transition[];
};

export type Operation_Sync =
  | `${Categories_Recurrence}_${"CREATED" | "UPDATED" | "DELETED"}`
  | "SERIES_CREATED"
  | "INSTANCES_UPDATED"
  | "SERIES_DELETED"
  | null;

export type Event_Transition = {
  title: string;
  transition: [Categories_Recurrence | null, TransitionCategoriesRecurrence];
  category: Categories_Recurrence;
  operation: Operation_Sync;
};
