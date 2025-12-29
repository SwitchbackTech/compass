import { Request, Response } from "express";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { zObjectId } from "@core/types/type.utils";
import { UserMetadata, UserProfile } from "@core/types/user.types";
import { SReqBody } from "@backend/common/types/express.types";
import userMetadataService from "@backend/user/services/user-metadata.service";
import userService from "@backend/user/services/user.service";

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
      }
      res.status(Status.INTERNAL_SERVER).send();
    }
  };
}

export default new UserController();
