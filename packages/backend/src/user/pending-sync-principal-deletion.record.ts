/**
 * A durable retry queue for Sync account purges. It contains only the Compass
 * principal id, never calendar content, credentials, or profile data.
 */
export type PendingSyncPrincipalDeletionRecord = {
  _id: string;
  requestedAt: Date;
  lastAttemptAt: Date;
  attempts: number;
};
