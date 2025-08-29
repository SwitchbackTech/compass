import { z } from "zod";

/* v1 */
export const Schema_Answers_v1 = z.object({
  email: z.string().email(),
  schemaVersion: z.literal("1"),
  source: z.enum(["search-engine", "social-media", "friend", "other"]),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  profession: z.string().optional(),
  currentlyPayingFor: z.array(z.string()).optional(),
  anythingElse: z.string().optional(),
});
export type Answers_v1 = z.infer<typeof Schema_Answers_v1>;

export const Answers = {
  v1: Schema_Answers_v1,
};
