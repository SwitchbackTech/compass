import { Request, Response } from "express";
import { ENV } from "@backend/common/constants/env.constants";
import { EmailerError } from "@backend/common/constants/error.constants";
import WaitlistService from "../service/waitlist.service";
import { Answers_v0, Schema_Waitlist } from "../types/waitlist.types";

export class WaitlistController {
  static async addToWaitlist(
    req: Request<unknown, unknown, Answers_v0>,
    res: Response,
  ) {
    if (!ENV.EMAILER_LIST_ID || !ENV.EMAILER_SECRET) {
      return res.status(500).json({ error: "Emailer values are missing" });
    }

    const parseResult = Schema_Waitlist.v0.safeParse(req.body);
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
    } catch (err: unknown) {
      const maybeError = err as { description?: string; status?: number };
      if (
        maybeError?.description ===
          EmailerError.InvalidSubscriberData.description ||
        maybeError?.status === EmailerError.InvalidSubscriberData.status
      ) {
        return res.status(400).json({ error: "Invalid subscriber data" });
      }
      return res.status(500).json({ error: "Server error" });
    }
  }
}
