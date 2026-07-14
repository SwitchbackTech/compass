export type SyncStatusVariant = "syncing" | "healthy" | "warning" | "error";

export type SyncStatus = { variant: SyncStatusVariant; text: string } | null;
