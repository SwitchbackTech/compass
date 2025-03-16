export interface Params_Sync_Gcal extends Payload_Sync_Notif {
  nextSyncToken: string;
  userId: string;
  calendarId?: string;
}
export interface Params_WatchEvents {
  gCalendarId: string;
  channelId: string;
  expiration: string;
  nextSyncToken?: string;
}
export interface Payload_Resource_Events {
  gCalendarId: string;
  channelId: string;
  expiration: string;
  resourceId: string;
}
export interface Payload_Sync_Notif {
  channelId: string;
  resourceId: string;
  resourceState: string;
  expiration: string;
}

export interface Payload_Sync_Events extends Payload_Resource_Events {
  nextSyncToken: string;
  lastRefreshedAt?: Date;
  lastSyncedAt?: Date;
}

export interface Payload_Sync_Notif {
  channelId: string;
  resourceId: string;
  resourceState: string;
  expiration: string;
}

export interface Payload_Sync_Refresh {
  userId: string;
  payloads: Payload_Sync_Events[];
}
export interface Schema_Sync {
  user: string;
  google: {
    calendarlist: {
      gCalendarId: string;
      nextSyncToken: string;
      lastSyncedAt: Date;
    }[];
    events: Payload_Sync_Events[];
  };
}
