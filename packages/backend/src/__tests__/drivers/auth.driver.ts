import { ObjectId } from "bson";
import { z } from "zod/v4";
import { StringV4Schema, zObjectId } from "@core/types/type.utils";
import { Schema_User } from "@core/types/user.types";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import authController from "@backend/auth/controllers/auth.controller";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import mongoService from "@backend/common/services/mongo.service";

export class AuthDriver {
  static async googleSignup(): Promise<Schema_User> {
    const { gUser, gRefreshToken } = UserDriver.createGoogleAuthUser();
    const response = await authController.signup(gUser, gRefreshToken);

    expect(zObjectId.parse(response.cUserId)).toBeInstanceOf(ObjectId);
    expect(z.email().parse(response.email)).toBe(gUser.email);

    const user = await mongoService.user.findOne({
      _id: new ObjectId(response.cUserId),
    });

    expect(user).not.toBeNull();
    expect(user).toBeDefined();

    return user!;
  }

  static async googleLogin(userId: ObjectId): Promise<Schema_User> {
    const user = await mongoService.user.findOne({ _id: userId });

    expect(user).not.toBeNull();
    expect(user).toBeDefined();

    const _id = zObjectId.parse(user?._id);

    const gRefreshToken = UserDriver.generateGoogleRefreshToken({
      sub: StringV4Schema.parse(user?.google.googleId),
      email: z.email().parse(user?.email),
    });

    const gcal = await getGcalClient(_id);

    const { cUserId, email } = await authController.login(
      user!,
      gcal,
      gRefreshToken,
    );

    expect(cUserId).toBe(_id.toString());
    expect(z.email().safeParse(email).success).toBe(true);

    const authenticatedUser = await mongoService.user.findOne({
      _id: new ObjectId(cUserId),
    });

    expect(user).not.toBeNull();
    expect(user).toBeDefined();

    return authenticatedUser!;
  }

  static async signUpGoogleUsers(count: number): Promise<Array<Schema_User>> {
    return Promise.all(Array.from({ length: count }, AuthDriver.googleSignup));
  }
}
