import {
  Answers_v1,
  Answers_v2,
} from "@core/types/waitlist/waitlist.answer.types";
import { mapWaitlistAnswerToSubscriber } from "./waitlist.service.util";
import { getNormalizedEmail } from "./waitlist.service.util";

describe("getNormalizedEmail", () => {
  describe("valid email normalization", () => {
    it("should normalize email with mixed case and whitespace", () => {
      const email = "  Test@Example.COM  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("test@example.com");
    });

    it("should normalize email with only leading whitespace", () => {
      const email = "  user@domain.com";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user@domain.com");
    });

    it("should normalize email with only trailing whitespace", () => {
      const email = "user@domain.com  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user@domain.com");
    });

    it("should normalize email with mixed case only", () => {
      const email = "User@DOMAIN.com";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user@domain.com");
    });

    it("should normalize email with no changes needed", () => {
      const email = "user@domain.com";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user@domain.com");
    });

    it("should normalize email with numbers and special characters", () => {
      const email = "  User123+tag@domain-123.co.uk  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user123+tag@domain-123.co.uk");
    });

    it("should normalize email with subdomains", () => {
      const email = "  USER@sub.domain.com  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user@sub.domain.com");
    });
  });

  describe("edge cases", () => {
    it("should handle email with single character local part", () => {
      const email = "  A@domain.com  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("a@domain.com");
    });

    it("should handle email with long domain", () => {
      const email =
        "  user@very-long-domain-name-with-many-subdomains.example.co.uk  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe(
        "user@very-long-domain-name-with-many-subdomains.example.co.uk",
      );
    });

    it("should handle email with underscores in local part", () => {
      const email = "  user_name@domain.com  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user_name@domain.com");
    });

    it("should handle email with dots in local part", () => {
      const email = "  user.name@domain.com  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user.name@domain.com");
    });

    it("should handle email with hyphens in domain", () => {
      const email = "  user@my-domain.com  ";
      const normalizedEmail = getNormalizedEmail(email);
      expect(normalizedEmail).toBe("user@my-domain.com");
    });
  });

  describe("error cases", () => {
    it("should throw error for invalid email format", () => {
      const invalidEmail = "not-an-email";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email without @ symbol", () => {
      const invalidEmail = "userdomain.com";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email with only @ symbol", () => {
      const invalidEmail = "@";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email with @ at beginning", () => {
      const invalidEmail = "@domain.com";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email with @ at end", () => {
      const invalidEmail = "user@";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email with multiple @ symbols", () => {
      const invalidEmail = "user@domain@com";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email with spaces in local part", () => {
      const invalidEmail = "user name@domain.com";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for email with spaces in domain", () => {
      const invalidEmail = "user@domain .com";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for empty string", () => {
      const invalidEmail = "";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for whitespace only", () => {
      const invalidEmail = "   ";
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for null", () => {
      const invalidEmail = null as any;
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for undefined", () => {
      const invalidEmail = undefined as any;
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });

    it("should throw error for non-string types", () => {
      const invalidEmail = 123 as any;
      expect(() => getNormalizedEmail(invalidEmail)).toThrow();
    });
  });

  describe("real-world examples", () => {
    it("should normalize common email formats", () => {
      const testCases = [
        { input: "  John.Doe@Company.COM  ", expected: "john.doe@company.com" },
        {
          input: "jane.smith+tag@example.org",
          expected: "jane.smith+tag@example.org",
        },
        {
          input: "  contact@my-website.co.uk  ",
          expected: "contact@my-website.co.uk",
        },
        { input: "SUPPORT@HELPDESK.NET", expected: "support@helpdesk.net" },
        { input: "  info@domain123.com  ", expected: "info@domain123.com" },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = getNormalizedEmail(input);
        expect(result).toBe(expected);
      });
    });
  });
});

describe("mapWaitlistAnswerToSubscriber", () => {
  it("maps v1 answers with full waitlist details", () => {
    const email = "test@example.com";
    const answer: Answers_v1 = {
      email,
      schemaVersion: "1",
      source: "search-engine",
      firstName: "Ada",
      lastName: "Lovelace",
      profession: "Engineer",
      currentlyPayingFor: ["calendar"],
      anythingElse: "Early adopter",
    };

    const subscriber = mapWaitlistAnswerToSubscriber(email, answer);

    expect(subscriber).toEqual({
      email_address: email,
      first_name: answer.firstName,
      state: "active",
      fields: {
        "Last name": answer.lastName,
        Birthday: "1970-01-01",
        Source: answer.source,
      },
    });
  });

  it("maps v2 answers with sensible defaults", () => {
    const email = "test-v2@example.com";
    const answer: Answers_v2 = {
      email,
      schemaVersion: "2",
    };

    const subscriber = mapWaitlistAnswerToSubscriber(email, answer);

    expect(subscriber).toEqual({
      email_address: email,
      first_name: null,
      state: "active",
      fields: null,
    });
    expect(subscriber.fields).toBeNull();
  });

  it("sets optional fields to null for non-v1 schemas", () => {
    const email = "someone@example.com";
    const answer: Answers_v2 = {
      email,
      schemaVersion: "2",
    };

    const subscriber = mapWaitlistAnswerToSubscriber(email, answer);

    expect(subscriber.first_name).toBeNull();
    expect(subscriber.fields).toBeNull();
  });
});
