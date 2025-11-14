import { Request, Response } from "express";
import { Status } from "@core/errors/status.codes";
import { zObjectId } from "@core/types/type.utils";
import { UserMetadata } from "@core/types/user.types";
import { SReqBody } from "@backend/common/types/express.types";
import userMetadataService from "@backend/user/services/user-metadata.service";

class UserController {
  getMetadata = async (
    req: Request<never, UserMetadata, never, never>,
    res: Response<UserMetadata>,
  ) => {
    const user = zObjectId.parse(req.session?.getUserId());
    const metadata = await userMetadataService.fetchUserMetadata(
      user.toString(),
    );

    res.status(Status.OK).json(metadata);
  };

  updateMetadata = async (
    req: SReqBody<UserMetadata>,
    res: Response<UserMetadata>,
  ) => {
    const user = zObjectId.parse(req.session?.getUserId());

    const metadata = await userMetadataService.updateUserMetadata({
      userId: user.toString(),
      data: req.body,
    });

    res.status(Status.OK).json(metadata);
  };
}

export default new UserController();
