import mongoService from "@backend/common/services/mongo.service";

export class GoogleWatchDriver {
  static removeActiveGoogleWatchesForUser(
    userId: string,
  ): ReturnType<typeof mongoService.watch.deleteMany> {
    return mongoService.watch.deleteMany({ user: userId });
  }
}
