import { z } from "zod";
import { Schema_Answers_v0 } from "./waitlist.answer.types";

export interface Result_Waitlist {
  status: "waitlisted" | "ignored";
}

const Schema_Status = z.enum(["waitlisted", "invited", "active"]);

const Schema_Waitlist_v0 = Schema_Answers_v0.extend({
  status: Schema_Status,
  waitlistedAt: z.string().datetime(),
});
export type Schema_Waitlist_v0 = z.infer<typeof Schema_Waitlist_v0>;
export type Schema_Waitlist = Schema_Waitlist_v0; // make a union type when adding more versions
