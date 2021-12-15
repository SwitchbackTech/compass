export interface ImportResult$GCal {
  total: number;
  nextSyncToken: string | null | undefined;
  errors: any[];
}

export interface SyncResult$Gcal {
   foo: any; 
}

export interface Body$Watch$Stop {
  channelId: string;
  resourceId: string;
}

export interface Body$Watch$Start {
  calendarId: string;
  channelId: string;
}