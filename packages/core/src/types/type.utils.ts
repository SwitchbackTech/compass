import { ObjectId } from "bson";
import { z } from "zod";
import { z as zod4 } from "zod/v4";
import { z as zod4Mini } from "zod/v4-mini";

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

export const IDSchemaV4 = zod4.string().refine(ObjectId.isValid, {
  message: "Invalid id",
});

export const zObjectIdMini = zod4Mini.pipe(
  zod4Mini.custom<ObjectId | string>(ObjectId.isValid),
  zod4Mini.transform((v) => new ObjectId(v)),
);

export const zObjectId = zod4.pipe(
  zod4.custom<ObjectId | string>((v) => ObjectId.isValid(v as string)),
  zod4.transform((v) => new ObjectId(v)),
);

export const TimezoneSchema = zod4.string().refine(
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

export const RGBHexSchema = zod4.string().regex(/^#[0-9a-f]{6}$/i, {
  message: "Invalid color. Must be a 7-character hex color code.",
});
