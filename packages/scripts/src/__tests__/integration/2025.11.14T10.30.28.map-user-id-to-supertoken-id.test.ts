import { MigrationParams } from "umzug";
import { Logger } from "winston";
import { faker } from "@faker-js/faker";
import { MigrationContext, MigratorType } from "@scripts/common/cli.types";
import Seeder from "@scripts/seeders/2025.11.14T10.30.28.map-user-id-to-supertoken-id";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";

describe("Seeder: map-user-id-to-supertoken-id", () => {
  const logger = { info: jest.fn(), error: jest.fn() };
  const seeder = new Seeder();
  const numUsers = faker.number.int({ min: 5, max: 10 });

  const context: MigrationContext = {
    logger: logger as unknown as Logger,
    migratorType: MigratorType.SEEDER,
    unsafe: false,
  };

  const params: MigrationParams<MigrationContext> = {
    context,
    name: seeder.name,
    path: seeder.path,
  };

  beforeAll(setupTestDb);
  beforeAll(initSupertokens);
  beforeEach(UserDriver.createUsers.bind(null, numUsers));
  afterEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("should exit early when no users exist in MongoDB", async () => {
    await mongoService.user.deleteMany({});

    await seeder.up(params);

    expect(logger.info).toHaveBeenLastCalledWith("No users to map. Exiting.");
    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it("should map users to supertoken user", async () => {
    await seeder.up(params);

    expect(logger.info).toHaveBeenCalledWith("Found 0 mapped users");

    expect(logger.info).toHaveBeenCalledWith(
      `Mapped ${numUsers} out of ${numUsers} users.`,
    );

    expect(logger.info).toHaveBeenCalledWith(
      "Mapping complete. Removing temporary file.",
    );

    expect(logger.error).toHaveBeenCalledTimes(0);
  });

  it("should resolve without error for the down method", async () => {
    const seeder = new Seeder();
    await expect(seeder.down()).resolves.toBeUndefined();
  });
});
