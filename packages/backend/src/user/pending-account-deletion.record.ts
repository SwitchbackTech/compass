export type PendingAccountDeletionRecord = {
  _id: string;
  createdAt: Date;
  stripeCustomerDeletedAt?: Date;
  compassDataDeletedAt?: Date;
  lastSyncPurgeAttemptAt?: Date;
  syncPurgeAttempts?: number;
};
