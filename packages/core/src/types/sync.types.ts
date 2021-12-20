import { BulkWriteResult } from 'mongodb';
export interface ImportResult$GCal {
  total: number;
  nextSyncToken: string | null | undefined;
  errors: any[];
}

export interface NotifResult$Gcal {
   params: object;
   init?: object;
   sync?: SyncEventsResult$Gcal
  }

export interface SyncEventsResult$Gcal {
     syncToken?: object;
     events?: undefined | BulkWriteResult;
   }


export interface SyncRequest$Gcal {
  channelId: string; 
  resourceId: string; 
  resourceState: string;
  expiration:  string; 
}

export interface SyncParams$Gcal extends SyncRequest$Gcal {
  nextSyncToken: string; 
  userId: string;
  calendarId?: string;
}

export interface Body$Watch$Stop {
  channelId: string;
  resourceId: string;
}

export interface Body$Watch$Start {
  calendarId: string;
  channelId: string;
}