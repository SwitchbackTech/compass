import { Request, Response } from "express";
import { Status } from "@core/errors/status.codes";
import { zObjectId } from "@core/types/type.utils";
import { UserMetadata } from "@core/types/user.types";
import { SReqBody } from "@backend/common/types/express.types";
import userService from "@backend/user/services/user.service";

class UserController {
  getMetadata = async (
    req: Request<never, UserMetadata, never, never>,
    res: Response<UserMetadata>,
  ) => {
    const user = zObjectId.parse(req.session?.getUserId());
    const metadata = await userService.fetchUserMetadata(user.toString());

    res.status(Status.OK).json(metadata);
  };

  updateMetadata = async (
    req: SReqBody<UserMetadata>,
    res: Response<UserMetadata>,
  ) => {
    const user = zObjectId.parse(req.session?.getUserId());

    const metadata = await userService.updateUserMetadata({
      userId: user.toString(),
      data: req.body,
    });

    res.status(Status.OK).json(metadata);
  };
}

export default new UserController();
