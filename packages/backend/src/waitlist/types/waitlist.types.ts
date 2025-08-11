import { z } from "zod";

export const EmailSchema = z
  .string()
  .trim() // trim whitespace
  .toLowerCase() // normalize case (emails are not case-sensitive)
  .email("Invalid email address");
