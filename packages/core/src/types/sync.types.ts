export interface ImportResult$GCal {
  total: number;
  nextSyncToken: string | null | undefined;
  errors: any[];
}

export interface SyncResult$Gcal {
   request: object;
   init?: object;
   sync?: {
     syncToken?: object;
     updated?: object;
     deleted?: object
   }
}

export interface SyncParams$Gcal {
  calendarId: string; 
  resourceId: string; 
  resourceState: string;
  expiration:  string; 
}

export interface Body$Watch$Stop {
  channelId: string;
  resourceId: string;
}

export interface Body$Watch$Start {
  calendarId: string;
  channelId: string;
}