import { z } from "zod";

export interface Result_Waitlist {
  status: "waitlisted" | "ignored";
}

/* v0 */
export const Schema_Answers_v0 = z.object({
  email: z.string().email(),
  schemaVersion: z.literal("v0"),
  source: z.enum(["search-engine", "social-media", "friend", "other"]),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  currentlyPayingFor: z.array(z.string()).optional(),
  howClearAboutValues: z.enum(["not-clear", "somewhat-clear", "very-clear"]),
  workingTowardsMainGoal: z.enum([
    "yes",
    "no-but-want-to",
    "no-and-dont-want-to",
  ]),
  isWillingToShare: z.boolean(),
  anythingElse: z.string().optional(),
});
export type Answers_v0 = z.infer<typeof Schema_Answers_v0>;

const Schema_Waitlist_v0 = Schema_Answers_v0.extend({
  waitlistedAt: z.string().datetime(),
});
export type Schema_Waitlist_v0 = z.infer<typeof Schema_Waitlist_v0>;

/* All */
export type Schema_Waitlist = Schema_Waitlist_v0; // make a union type when adding more versions
export type Schema_Answers = Answers_v0; // make a union type when adding more versions

export const AnswerMap = {
  v0: Schema_Answers_v0,
  //v1: Schema_Answers_v1 <-- Extend/change for new version to avoid migration
};
