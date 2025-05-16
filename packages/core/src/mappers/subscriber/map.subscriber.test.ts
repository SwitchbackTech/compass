import { Subscriber, SubscriberSchema } from "@core/types/email/email.types";

describe("Subscriber", () => {
  it("parses a valid subscriber", () => {
    const validSubscriber: Subscriber = {
      email_address: "test@example.com",
      first_name: "Test",
      state: "active",
      fields: {
        "Last name": "User",
        Birthday: "1970-01-01",
        Source: "unknown",
        Role: "unknown",
        Company: "unknown",
        "Postal code": "unknown",
        Website: "unknown",
        "Social media": "unknown",
        "How did you hear about us?": "unknown",
        Interests: "unknown",
        Coupon: "unknown",
      },
    };

    const result = SubscriberSchema.safeParse(validSubscriber);
    expect(result.success).toBe(true);
  });

  it("fails to parse an invalid subscriber", () => {
    const invalidSubscriber: Subscriber = {
      email_address: "invalid",
      first_name: "Test",
      state: "active",
      fields: {
        "Last name": "User",
        Birthday: "1970-01-01",
        Source: "unknown",
        Role: "unknown",
        Company: "unknown",
        "Postal code": "unknown",
        Website: "unknown",
        "Social media": "unknown",
        "How did you hear about us?": "unknown",
        Interests: "unknown",
        Coupon: "unknown",
      },
    };

    const result = SubscriberSchema.safeParse(invalidSubscriber);
    expect(result.success).toBe(false);
  });
});
