import { z } from "zod";

export const safeValidate = <T>(schema: z.ZodType<T>, data: unknown) => {
  const result = schema.safeParse(data);

  return result;
};
