export interface Schema_CalendarList {
    user: string;
    google?: Schema_GCalList;
}

export interface Schema_GCalList {
    nextSyncToken: string; // refers to the calendarList
    items: Schema_GCal[];
}

export interface Schema_GCal {
    primary?: boolean;
    id: string;
    summary: string;
    description: string;
    sync?: {
        expiration: string; 
        nextSyncToken: string; 
        channelId: string;
        resourceId: string;
    }
}