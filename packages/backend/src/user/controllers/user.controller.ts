import { type Request, type Response } from "express";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { zObjectId } from "@core/types/type.utils";
import { type UserMetadata, type UserProfile } from "@core/types/user.types";
import { type SReqBody } from "@backend/common/types/express.types";
import userService from "@backend/user/services/user.service";
import userMetadataService from "@backend/user/services/user-metadata.service";
import { type Summary_Delete } from "@backend/user/types/user.types";

const logger = Logger("app:user.controller");

class UserController {
  getProfile = async (
    req: Request<never, UserProfile, never, never>,
    res: Response<UserProfile>,
  ) => {
    try {
      const user = zObjectId.parse(req.session?.getUserId());
      const profile = await userService.getProfile(user);

      res.status(Status.OK).json(profile);
    } catch (e) {
      if (e instanceof BaseError) {
        res.status(e.statusCode).send();
        return;
      }
      res.status(Status.INTERNAL_SERVER).send();
    }
  };
  deleteAccount = async (
    req: Request<never, Summary_Delete, never, never>,
    res: Response<Summary_Delete>,
  ) => {
    try {
      // Session-derived only: a user may never delete anyone but themselves.
      const user = zObjectId.parse(req.session?.getUserId());
      const summary = await userService.deleteAccount(user.toString());

      // deleteAccount revokes the user's sessions server-side, but that
      // leaves this caller holding an access token that still passes
      // signature checks until it expires - long enough to boot back up as
      // the deleted user and start failing requests against data that no
      // longer exists. This clears their cookies on the way out. Safe after
      // the delete: revokeSession clears them without checking whether the
      // session row is still there.
      //
      // Best-effort on purpose: the account is already gone, so failing here
      // would tell the user their deletion failed when it didn't.
      try {
        await req.session?.revokeSession();
      } catch (e) {
        logger.warn(
          `Deleted ${user.toString()} but could not clear their session cookies`,
          e,
        );
      }

      res.status(Status.OK).json(summary);
    } catch (e) {
      if (e instanceof BaseError) {
        res.status(e.statusCode).send();
        return;
      }
      res.status(Status.INTERNAL_SERVER).send();
    }
  };

  getMetadata = async (
    req: Request<never, UserMetadata, never, never>,
    res: Response<UserMetadata>,
  ) => {
    try {
      const user = zObjectId.parse(req.session?.getUserId());
      const metadata = await userMetadataService.fetchUserMetadata(
        user.toString(),
      );

      res.status(Status.OK).json(metadata);
    } catch (e) {
      if (e instanceof BaseError) {
        res.status(e.statusCode).send();
        return;
      }
      res.status(Status.INTERNAL_SERVER).send();
    }
  };

  updateMetadata = async (
    req: SReqBody<UserMetadata>,
    res: Response<UserMetadata>,
  ) => {
    try {
      const user = zObjectId.parse(req.session?.getUserId());

      const metadata = await userMetadataService.updateUserMetadata({
        userId: user.toString(),
        data: req.body,
      });

      res.status(Status.OK).json(metadata);
    } catch (e) {
      if (e instanceof BaseError) {
        res.status(e.statusCode).send();
        return;
      }
      res.status(Status.INTERNAL_SERVER).send();
    }
  };
}

export default new UserController();
