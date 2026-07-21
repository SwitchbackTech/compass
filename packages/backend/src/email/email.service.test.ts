import { faker } from "@faker-js/faker";
import { type Schema_User } from "@core/types/user.types";
import EmailService from "./email.service";
import { afterEach, describe, expect, it, mock } from "bun:test";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("EmailService", () => {
  it("checks an exact active Kit subscriber with one request", async () => {
    const email = faker.internet.email().toLowerCase();
    const fetchMock = mock().mockResolvedValue(
      new Response(
        JSON.stringify({
          subscribers: [{ id: 1, email_address: email, state: "active" }],
        }),
      ),
    );
    globalThis.fetch = fetchMock;

    const status = await EmailService.getEmailUpdatesStatus(email);

    expect(status).toBe("subscribed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.kit.com/v4/subscribers?email_address=${encodeURIComponent(email)}&per_page=1&status=all`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("does not offer a new subscription to a cancelled Kit subscriber", async () => {
    const email = faker.internet.email().toLowerCase();
    globalThis.fetch = mock().mockResolvedValue(
      new Response(
        JSON.stringify({
          subscribers: [{ id: 1, email_address: email, state: "cancelled" }],
        }),
      ),
    );

    await expect(EmailService.getEmailUpdatesStatus(email)).resolves.toBe(
      "unsubscribed",
    );
  });

  it("subscribes with one subscriber upsert and no tag request", async () => {
    const user: Schema_User = {
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      locale: "en-US",
      name: faker.person.fullName(),
    };
    const fetchMock = mock().mockResolvedValue(
      new Response(
        JSON.stringify({
          subscriber: {
            created_at: new Date().toISOString(),
            email_address: user.email,
            fields: {},
            first_name: user.firstName,
            id: 1,
            state: "active",
          },
        }),
      ),
    );
    globalThis.fetch = fetchMock;

    const status = await EmailService.subscribeToEmailUpdates(user);

    expect(status).toBe("subscribed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.kit.com/v4/subscribers",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
