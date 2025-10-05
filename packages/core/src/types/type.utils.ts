import { ObjectId } from "bson";
import { z } from "zod";

export type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: unknown;
};

//example:
//data: Omit<Payload_Resource_Events, "nextSyncToken">
// same as Payload..., except for "nextSyncToken"
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export const IDSchema = z.string().refine(ObjectId.isValid, {
  message: "Invalid id",
});

export const TimezoneSchema = z.string().refine(
  (timeZone) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone });

      return true;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      return false;
    }
  },
  { message: "Invalid timezone" },
);

export const RGBHexSchema = z.string().regex(/^#[0-9a-f]{6}$/i, {
  message: "Invalid color. Must be a 7-character hex color code.",
});
