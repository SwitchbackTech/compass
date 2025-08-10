import { EmailSchema } from "../types/waitlist.types";

export const getNormalizedEmail = (email: string) => EmailSchema.parse(email);
