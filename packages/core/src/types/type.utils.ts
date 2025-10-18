import { ObjectId } from "bson";
import { z } from "zod";
import { z as zod4 } from "zod/v4";
import { z as zod4Mini } from "zod/v4-mini";
import dayjs from "@core/util/date/dayjs";

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

export const zBase64String = zod4Mini.base64();

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

export const ExpirationDateSchema = zod4
  .union([
    zod4.date(),
    zod4
      .string()
      .regex(/\d+/)
      .transform((v) => dayjs(parseInt(v, 10)).toDate()),
  ])
  .pipe(
    zod4.custom<Date>((v) => v instanceof Date && dayjs().isBefore(v), {
      error: "expiration must be a future date",
    }),
  );

export const StringV4Schema = zod4.string().nonempty();
