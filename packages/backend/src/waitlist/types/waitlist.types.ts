import { z } from "zod";

// Validate and normalize email consistently (trim + lowercase before validation)
export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email address");
