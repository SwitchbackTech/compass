import { InsertManyResult } from "mongodb";
import { Query } from "express-serve-static-core";

export interface Event {
  // note: no id field here
  gEventId?: string;
  // this user field can cause issues if someone adds it and it doesnt match the one
  // created during JWT middleware
  // user: string;
  priorities: string[];
  summary: string;
  description?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
  end?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  };
}

export type EventData = Event | Event[];

export interface EventWithId extends Event {
  _id?: string; // not all requests will know the id (eg POSTs)
}

export interface EventDTO extends Event {
  _id: string; // needs to always return events id
}

export interface EventsDTO extends InsertManyResult {}

export interface Query$Event extends Query {
  start?: string;
  end?: string;
  priorities?: string; // example: 'p1,p2,p3'
}

export interface ImportResult$GCal {
  total: number;
  nextSyncToken: string | null | undefined;
  errors: [];
}
