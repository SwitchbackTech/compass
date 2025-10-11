import { z } from "zod";
import { Schema_Answers_v1, Schema_Answers_v2 } from "./waitlist.answer.types";

export interface Result_Waitlist {
  status: "waitlisted" | "ignored";
}

export interface Result_InviteToWaitlist {
  status: "invited" | "ignored";
}

const Schema_Status = z.enum(["waitlisted", "invited", "active"]);

const Schema_Waitlist_v1 = Schema_Answers_v1.extend({
  status: Schema_Status,
  waitlistedAt: z.string().datetime(),
});

const Schema_Waitlist_v2 = Schema_Answers_v2.extend({
  status: Schema_Status,
  waitlistedAt: z.string().datetime(),
});

type Schema_Waitlist_v1 = z.infer<typeof Schema_Waitlist_v1>;
type Schema_Waitlist_v2 = z.infer<typeof Schema_Waitlist_v2>;
export type Schema_Waitlist = Schema_Waitlist_v1 | Schema_Waitlist_v2;
