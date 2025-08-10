import { Request, Response } from "express";
import { z } from "zod";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { AnswerMap } from "@core/types/waitlist/waitlist.answer.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import { isMissingWaitlistTagId } from "@backend/common/constants/env.util";
import { findCompassUserBy } from "../../user/queries/user.queries";
import WaitlistService from "../service/waitlist.service";

const logger = Logger("app:waitlist.controller");

export class WaitlistController {
  private static EmailQuerySchema = z.object({ email: z.string().email() });

  static async addToWaitlist(
    req: Request<unknown, unknown, Schema_Waitlist>,
    res: Response,
  ) {
    if (isMissingWaitlistTagId()) {
      return res.status(500).json({ error: "Emailer values are missing" });
    }

    const parseResult = AnswerMap.v0.safeParse(req.body);
    if (!parseResult.success) {
      return res
        .status(400)
        .json({ error: "Invalid input", details: parseResult.error.flatten() });
    }

    const answers = parseResult.data;
    try {
      const result = await WaitlistService.addToWaitlist(
        answers.email,
        answers,
      );
      return res.status(200).json(result);
    } catch (err) {
      // If the error is a BaseError (including EmailerError), return its status and description
      if (err instanceof BaseError) {
        logger.error(err);
        return res.status(err.statusCode).json({ error: err.description });
      }
      // If it's a generic Error, return its message
      if (err instanceof Error) {
        logger.error(err);
        return res.status(500).json({ error: err.message });
      }
      // Otherwise, return a generic server error
      logger.error("caught unknown error");
      return res.status(500).json({ error: "Server error" });
    }
  }

  static async isInvited(
    req: Request<unknown, unknown, unknown, { email: string }>,
    res: Response<{ isInvited: boolean }>,
  ) {
    const parsed = WaitlistController.EmailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      logger.error("Invalid email provided for invite check");
      return res.status(400).json({ isInvited: false });
    }

    const { email } = parsed.data;
    const isInvited = await WaitlistService.isInvited(email);
    return res.status(200).json({ isInvited });
  }

  static async isOnWaitlist(
    req: Request<unknown, unknown, unknown, { email: string }>,
    res: Response<{ isOnWaitlist: boolean }>,
  ) {
    const parsed = WaitlistController.EmailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      logger.error("Invalid email provided for waitlist check");
      return res.status(400).json({ isOnWaitlist: false });
    }

    const { email } = parsed.data;
    const isOnWaitlist = await WaitlistService.isOnWaitlist(email);
    return res.status(200).json({ isOnWaitlist });
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
    return res.status(200).json({
      isOnWaitlist,
      isInvited,
      isActive,
      firstName: waitlistRecord?.firstName ?? existingUser?.firstName,
      lastName: waitlistRecord?.lastName ?? existingUser?.lastName,
    });
  }
}
