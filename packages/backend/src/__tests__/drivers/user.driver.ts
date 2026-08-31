import { faker } from "@faker-js/faker";
import { type TokenPayload } from "google-auth-library";
import { ObjectId, type WithId } from "mongodb";
import { type Schema_User } from "@core/types/user.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { type PendingAccountDeletionRecord } from "@backend/user/pending-account-deletion.record";
import userService from "../../user/services/user.service";

interface CreateUserOptions {
  /** When false, creates a user with no Google data (never connected). */
  withGoogle?: boolean;
}

type LegacyPendingSyncPrincipalDeletionRecord = {
  _id: string;
  requestedAt: Date;
  lastAttemptAt: Date;
  attempts: number;
};

export class UserDriver {
  static generateGoogleUser(
    overrides: Partial<TokenPayload> = {},
  ): TokenPayload {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
      iss: "https://accounts.google.com",
      azp: faker.string.uuid(),
      aud: faker.string.uuid(),
      sub: faker.string.uuid(),
      email: faker.internet.email(),
      email_verified: true,
      at_hash: faker.string.alphanumeric(10),
      name: `${firstName} ${lastName}`,
      given_name: firstName,
      family_name: lastName,
      picture: faker.image.urlPicsumPhotos(),
      locale: "en",
      iat: faker.number.int({ min: 1, max: 1000 }),
      exp: faker.number.int({ min: 1001, max: 2000 }),
      ...overrides,
    };
  }

  static async createUser(
    options: CreateUserOptions = {},
  ): Promise<WithId<Schema_User>> {
    const { withGoogle = true } = options;
    const gUser = UserDriver.generateGoogleUser();

    const { userId, ...user } = await userService.createUser(gUser);

    const _id = new ObjectId(userId);

    // Simulate "user never connected Google" by removing all Google data
    if (!withGoogle) {
      await mongoService.user.updateOne({ _id }, { $unset: { google: "" } });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally omit google from returned user
      const { google: _google, ...rest } = user;
      return { ...rest, _id };
    }

    return { ...user, _id };
  }

  static async createUsers(count: number): Promise<Array<WithId<Schema_User>>> {
    return Promise.all(
      Array.from({ length: count }, () => UserDriver.createUser()),
    );
  }

  static async createPendingAccountDeletions(
    count: number,
    build: (index: number) => Partial<PendingAccountDeletionRecord>,
  ): Promise<PendingAccountDeletionRecord[]> {
    const records = Array.from({ length: count }, (_, index) => {
      const {
        _id = mongoService.objectId().toString(),
        createdAt = new Date(),
        ...stages
      } = build(index);
      return { _id, createdAt, ...stages };
    });
    await mongoService.pendingAccountDeletion.insertMany(records);
    return records;
  }

  static async createLegacyPendingSyncPrincipalDeletion(
    overrides: Partial<LegacyPendingSyncPrincipalDeletionRecord> = {},
  ): Promise<LegacyPendingSyncPrincipalDeletionRecord> {
    const now = new Date();
    const {
      _id = mongoService.objectId().toString(),
      requestedAt = now,
      lastAttemptAt = requestedAt,
      attempts = 0,
    } = overrides;
    const record = {
      _id,
      requestedAt,
      lastAttemptAt,
      attempts,
    };
    await UserDriver.#legacyPendingSyncPrincipalDeletion.insertOne(record);
    return record;
  }

  static findLegacyPendingSyncPrincipalDeletion(userId: string) {
    return UserDriver.#legacyPendingSyncPrincipalDeletion.findOne({
      _id: userId,
    });
  }

  static get #legacyPendingSyncPrincipalDeletion() {
    return mongoService.db.collection<LegacyPendingSyncPrincipalDeletionRecord>(
      Collections.LEGACY_PENDING_SYNC_PRINCIPAL_DELETION,
    );
  }
}
