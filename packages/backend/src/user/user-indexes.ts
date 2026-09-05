import mongoService from "@backend/common/services/mongo.service";

export const USER_IDENTITIES_PROVIDER_SUBJECT_INDEX =
  "user_identities_provider_subject_unique";

export async function ensureUserIndexes(): Promise<void> {
  await mongoService.user.createIndex(
    { "identities.provider": 1, "identities.subjectId": 1 },
    {
      name: USER_IDENTITIES_PROVIDER_SUBJECT_INDEX,
      unique: true,
      partialFilterExpression: { identities: { $exists: true } },
    },
  );
}
