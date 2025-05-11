import { z } from "zod";

const WaitlistBaseSchema = z.object({
  email: z.string().email(),
});

const Answers_v0 = WaitlistBaseSchema.extend({
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

export const Schema_Waitlist = {
  v0: Answers_v0,
};

export type Answers_v0 = z.infer<typeof Schema_Waitlist.v0>;
