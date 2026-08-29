export type PendingAccountDeletionRecord = {
  _id: string;
  createdAt: Date;
  stripeCustomerDeletedAt?: Date;
};
