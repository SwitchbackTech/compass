import type express from "express";
import { verifySession } from "@backend/auth/session/session.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import contactsController from "./controllers/contacts.controller";

/**
 * Contacts Routes Configuration (WP-06). One authenticated read: the browser
 * proxy for sync's contact-suggestion lookup. Middleware parity with event
 * reads — `verifySession()` only; reads are not billing-gated (billing guards
 * writes, see event.controller's assertBillingAllowsWrites).
 */
export class ContactsRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "ContactsRoutes");
  }

  configureRoutes(): express.Application {
    this.app
      .route(`/api/contacts/suggestions`)
      .all(verifySession())
      .get(contactsController.suggestions);

    return this.app;
  }
}
