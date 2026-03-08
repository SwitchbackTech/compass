import mongoService from "@backend/common/services/mongo.service";

/**
 * Test driver for the watch collection.
 * Use this instead of importing mongoService in tests so persistence can be
 * swapped (e.g. away from Mongo) without changing test code.
 */
export class WatchDriver {
  static deleteManyByUser(
    userId: string,
  ): ReturnType<typeof mongoService.watch.deleteMany> {
    return mongoService.watch.deleteMany({ user: userId });
  }
}
