import { Request, Response } from "express";
import { z } from "zod";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import {
  Answers,
  Answers_v1,
  Answers_v2,
} from "@core/types/waitlist/waitlist.answer.types";
import { isMissingWaitlistTagId } from "@backend/common/constants/env.util";
import { findCompassUserBy } from "../../user/queries/user.queries";
import WaitlistService from "../service/waitlist.service";
import { EmailSchema } from "../types/waitlist.types";

const logger = Logger("app:waitlist.controller");
const WaitlistAnswerSchema = Answers.v1.or(Answers.v2);

export class WaitlistController {
  private static EmailQuerySchema = z.object({ email: EmailSchema });

  private static handleError(err: unknown, res: Response) {
    if (err instanceof BaseError) {
      logger.error(err);
      return res.status(err.statusCode).json({ error: err.description });
    }
    if (err instanceof Error) {
      logger.error(err);
      return res.status(500).json({ error: err.message });
    }
    logger.error("caught unknown error");
    return res.status(500).json({ error: "Server error" });
  }

  static async addToWaitlist(
    req: Request<unknown, unknown, Answers_v1 | Answers_v2>,
    res: Response,
  ) {
    if (isMissingWaitlistTagId()) {
      return res.status(500).json({ error: "Missing emailer value(s)" });
    }

    const parseResult = WaitlistAnswerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: parseResult.error.flatten() });
    }

    try {
      const result = await WaitlistService.addToWaitlist(
        parseResult.data.email,
        parseResult.data,
      );
      return res.status(200).json(result);
    } catch (err) {
      return WaitlistController.handleError(err, res);
    }
  }

  static async status(
    req: Request<unknown, unknown, unknown, { email: string }>,
    res: Response<{
      isOnWaitlist: boolean;
      isInvited: boolean;
      isActive: boolean;
      firstName?: string;
      lastName?: string;
    }>,
  ) {
    const parsed = WaitlistController.EmailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      logger.error("Invalid email provided for waitlist status check");
      return res.status(400).json({
        isOnWaitlist: false,
        isInvited: false,
        isActive: false,
      });
    }

    const { email } = parsed.data;
    const [isOnWaitlist, isInvited, existingUser, waitlistRecord] =
      await Promise.all([
        WaitlistService.isOnWaitlist(email),
        WaitlistService.isInvited(email),
        findCompassUserBy("email", email),
        WaitlistService.getWaitlistRecord(email),
      ]);

    const isActive = !!existingUser;
    const name =
      waitlistRecord && "firstName" in waitlistRecord
        ? {
            firstName: waitlistRecord.firstName,
            lastName: waitlistRecord.lastName,
          }
        : undefined;

    return res.status(200).json({
      isOnWaitlist,
      isInvited,
      isActive,
      firstName: name?.firstName ?? existingUser?.firstName,
      lastName: name?.lastName ?? existingUser?.lastName,
    });
  }
}
