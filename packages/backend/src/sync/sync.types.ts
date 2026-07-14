import { z } from "zod/v4";

export const ImportGCalRequestSchema = z.object({
  force: z.boolean().optional(),
});
