import { Query } from "express-serve-static-core";

export interface Event$NoId {
  // note: no compass _id field here
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

export interface Event extends Event$NoId {
  _id: string; // needs to always return events id
}

export interface Params$DeleteMany {
  key: string;
  ids: string[];
}

export interface Result$DeleteMany {
  deletedCount: number;
  errors: any[];
}

export interface Query$Event extends Query {
  start?: string;
  end?: string;
  priorities?: string; // example: 'p1,p2,p3'
}


