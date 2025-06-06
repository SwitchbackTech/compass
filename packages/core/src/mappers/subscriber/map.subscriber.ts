import { Subscriber } from "@core/types/email/email.types";
import { Schema_User } from "@core/types/user.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";

export const mapCompassUserToEmailSubscriber = (
  user: Schema_User,
): Subscriber => {
  const UNKNOWN = "unknown";
  return {
    email_address: user.email,
    first_name: user.firstName,
    state: "active",
    fields: {
      "Last name": user.lastName,
      Birthday: "1970-01-01",
      Source: UNKNOWN,
      Role: UNKNOWN,
      Company: UNKNOWN,
      "Postal code": UNKNOWN,
      Website: UNKNOWN,
      "Social media": UNKNOWN,
      "How did you hear about us?": UNKNOWN,
      Interests: UNKNOWN,
      Coupon: UNKNOWN,
    },
  };
};

export const mapWaitlistUserToEmailSubscriber = (
  user: Schema_Waitlist,
): Subscriber => {
  const subscriber: Subscriber = {
    email_address: user.email,
    first_name: user.firstName,
    state: "active",
    fields: {
      "Last name": user.lastName,
      Birthday: "1970-01-01",
      Source: user.source,
    },
  };
  return subscriber;
};
