import { z } from "zod";
import { Query } from "express-serve-static-core";
import { Origin, Priority, Priorities } from "@core/constants/core.constants";

export enum Categories_Event {
  ALLDAY = "allday",
  TIMED = "timed",
  SOMEDAY_WEEK = "sidebarWeek",
  SOMEDAY_MONTH = "sidebarMonth",
}

export type Categories_Recur = "all" | "future";

export type Direction_Migrate = "forward" | "back";

export interface Params_DeleteMany {
  key: string;
  ids: string[];
}
export interface Params_Events {
  startDate: string;
  endDate: string;
  someday: boolean;
  /* these not implemented yet */
  page?: number;
  pageSize?: number;
  offset?: number;
  priorities?: Priorities[]; // TODO use ids instead of words
}

export interface Payload_Order {
  _id: string;
  order: number;
}

export interface Result_DeleteMany {
  deletedCount: number;
  errors: any[];
}

export interface Schema_Event {
  _id?: string;
  allDayOrder?: number;
  description?: string | null | undefined;
  endDate?: string;
  isAllDay?: boolean;
  isSomeday?: boolean;
  gEventId?: string;
  order?: number;
  origin?: Origin;
  priority?: Priority;
  recurrence?: {
    rule?: string[];
    eventId?: string;
  };
  startDate?: string;
  title?: string;
  updatedAt?: Date;
  user?: string;
}

export interface Schema_Event_Core extends Schema_Event {
  startDate: string;
  endDate: string;
  origin: Origin;
  priority: Priority;
  user: string;
}

export interface Query_Event extends Query {
  end?: string;
  someday?: string;
  start?: string;
  priorities?: string; // example: 'p1,p2,p3'
}

export interface Query_Event_Update extends Query {
  applyTo?: Categories_Recur;
}

const Recurrence = z.object({
  rule: z.array(z.string()).optional(),
  eventId: z.string().optional(),
});

export const CoreEventSchema = z.object({
  _id: z.string().optional(),
  description: z.string().nullable().optional(),
  endDate: z.union([z.string().datetime({ offset: true }), z.string().date()]),
  isAllDay: z.boolean().optional(),
  isSomeday: z.boolean().optional(),
  gEventId: z.string().optional(),
  origin: z.nativeEnum(Origin),
  priority: z.nativeEnum(Priorities),
  recurrence: Recurrence.optional(),
  startDate: z.union([
    z.string().datetime({ offset: true }),
    z.string().date(),
  ]),
  title: z.string().optional(),
  updatedAt: z.date().optional(),
  user: z.string(),
});

export type Event_Core = z.infer<typeof CoreEventSchema>;
