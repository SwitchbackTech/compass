import { Logger } from "@core/logger/winston.logger";
import { STRIPE_WEBHOOK_PATH } from "@backend/billing/billing.constants";
import { HANDLED_TYPES } from "@backend/billing/services/billing.webhook.service";
import {
  getStripeClient,
  STRIPE_API_VERSION,
} from "@backend/billing/services/stripe.client";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isStripeConfigured } from "@backend/common/constants/config.util";

const logger = Logger("scripts.commands.audit-stripe-config");

/**
 * Compares the live Stripe account against what this build expects, so
 * drift is something you run one command to find instead of something you
 * discover during a checkout.
 *
 * Every expectation reads the same constant the runtime reads --
 * STRIPE_API_VERSION, HANDLED_TYPES, STRIPE_WEBHOOK_PATH -- so there is no
 * second list to keep in step. Read-only. Exits 1 when anything is off so
 * it can gate a deploy.
 *
 *   COMPASS_CONFIG_FILE=~/.compass/staging.compass.yaml bun run cli audit-stripe-config
 */
export async function runAuditStripeConfig(): Promise<void> {
  const problems: string[] = [];
  const report: Record<string, unknown> = {};

  try {
    if (!isStripeConfigured(CONFIG)) {
      process.stdout.write(
        `${JSON.stringify({ stripeConfigured: false, problems: ["Stripe is not configured for this environment"] }, null, 2)}\n`,
      );
      process.exit(1);
    }

    const stripe = getStripeClient();
    // BASEURL is the api url (".../api") and STRIPE_WEBHOOK_PATH already
    // carries its own "/api" prefix, so build from the origin.
    const expectedUrl = `${new URL(CONFIG.BASEURL).origin}${STRIPE_WEBHOOK_PATH}`;
    const expectedEvents = [...HANDLED_TYPES].sort();

    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const mine = endpoints.data.filter((e) => e.url === expectedUrl);
    report["expectedWebhookUrl"] = expectedUrl;
    report["endpoints"] = mine.map((e) => ({
      id: e.id,
      status: e.status,
      api_version: e.api_version,
      enabled_events: e.enabled_events,
    }));

    if (mine.length === 0) {
      problems.push(`No Stripe webhook endpoint points at ${expectedUrl}`);
    }
    if (mine.length > 1) {
      problems.push(
        `${mine.length} webhook endpoints point at ${expectedUrl}; only one should. Duplicates double-deliver and only one signing secret can be configured.`,
      );
    }

    for (const endpoint of mine) {
      if (endpoint.status !== "enabled") {
        problems.push(`Endpoint ${endpoint.id} is ${endpoint.status}`);
      }
      if (endpoint.api_version !== STRIPE_API_VERSION) {
        problems.push(
          `Endpoint ${endpoint.id} delivers ${endpoint.api_version} but this build pins ${STRIPE_API_VERSION}. api_version cannot be updated in place -- recreate the endpoint and rotate STRIPE_WEBHOOK_SECRET.`,
        );
      }
      const actual = [...(endpoint.enabled_events ?? [])].sort();
      const missing = expectedEvents.filter((t) => !actual.includes(t));
      const extra = actual.filter(
        (t) => !expectedEvents.includes(t as (typeof expectedEvents)[number]),
      );
      if (missing.length) {
        problems.push(
          `Endpoint ${endpoint.id} is missing handled events: ${missing.join(", ")}`,
        );
      }
      if (extra.length) {
        problems.push(
          `Endpoint ${endpoint.id} subscribes to events nothing handles: ${extra.join(", ")}`,
        );
      }
    }

    const price = await stripe.prices.retrieve(CONFIG.STRIPE_PRICE_ID!, {
      expand: ["product"],
    });
    const product = price.product as { id: string; tax_code?: unknown };
    report["price"] = {
      id: price.id,
      active: price.active,
      unit_amount: price.unit_amount,
      tax_behavior: price.tax_behavior,
      product: product.id,
      product_tax_code: product.tax_code ?? null,
    };
    if (!price.active) problems.push(`Price ${price.id} is inactive`);

    const tax = await stripe.tax.settings.retrieve();
    report["tax"] = {
      status: tax.status,
      missing_fields: tax.status_details?.pending?.missing_fields ?? null,
    };
    // automatic_tax is enabled on every Checkout Session, and Stripe rejects
    // session creation outright when Tax is not active -- so this is a
    // checkout outage, not a reporting nicety.
    if (tax.status !== "active") {
      problems.push(
        `Stripe Tax is ${tax.status}; Checkout Session creation fails while automatic_tax is enabled. Missing: ${(tax.status_details?.pending?.missing_fields ?? []).join(", ") || "unknown"}`,
      );
    }
    if (price.tax_behavior === "unspecified") {
      problems.push(
        `Price ${price.id} has tax_behavior "unspecified"; set it (immutable once set) so tax is not guessed from the account default`,
      );
    }
    if (!product.tax_code) {
      problems.push(
        `Product ${product.id} has no tax_code; Stripe falls back to the account default category`,
      );
    }

    report["problems"] = problems;
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (problems.length) {
      logger.error(`audit-stripe-config found ${problems.length} problem(s)`);
      process.exit(1);
    }
    logger.info("audit-stripe-config clean");
    process.exit(0);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}
