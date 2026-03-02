import express from "express";
import { verifySession } from "supertokens-node/recipe/session/framework/express";
import authMiddleware from "@backend/auth/middleware/auth.middleware";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { requireGoogleConnectionSession } from "@backend/common/middleware/google.required.middleware";
import eventController from "./controllers/event.controller";

/**
 * Event Routes Configuration
 *
 * Handles calendar event CRUD operations and synchronization with Google Calendar.
 * Most operations require Google Calendar connection for bi-directional sync.
 */
export class EventRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "EventRoutes");
  }

  configureRoutes(): express.Application {
    /**
     * GET /api/event
     * Retrieves all events for the authenticated user
     *
     * POST /api/event
     * Creates a new calendar event
     *
     * @auth Required - Supertokens session
     * @auth Required for POST - Google Calendar connection
     * @body {Object} event - Event data (title, start, end, etc.)
     * @returns {Array|Object} All events (GET) or created event (POST)
     * @throws {401} Unauthorized - Invalid session
     * @throws {403} Forbidden - No Google Calendar connection (POST)
     * @throws {400} Bad Request - Invalid event data (POST)
     */
    this.app
      .route(`/api/event`)
      .all(verifySession())
      .get(eventController.readAll)
      .post(requireGoogleConnectionSession, eventController.create);

    /**
     * DELETE /api/event/deleteMany
     * Deletes multiple events in a batch operation
     *
     * @auth Required - Supertokens session
     * @body {Array<string>} ids - Array of event IDs to delete
     * @returns {Object} Deletion result
     * @throws {401} Unauthorized - Invalid session
     * @throws {400} Bad Request - Invalid IDs array
     */
    this.app
      .route(`/api/event/deleteMany`)
      .all(verifySession())
      .delete(eventController.deleteMany);

    /**
     * PUT /api/event/reorder
     * Reorders events (updates order field for drag-and-drop)
     *
     * @auth Required - Supertokens session
     * @body {Array<Object>} events - Array of events with updated order
     * @returns {Object} Reorder result
     * @throws {401} Unauthorized - Invalid session
     * @throws {400} Bad Request - Invalid events array
     */
    this.app
      .route(`/api/event/reorder`)
      .all(verifySession())
      .put(eventController.reorder);

    /**
     * DELETE /api/event/delete-all/:userId
     * Deletes all events for a specific user (Development only)
     *
     * @auth Required - Supertokens session + Dev environment
     * @param {string} userId - User ID whose events to delete
     * @returns {Object} Deletion result
     * @throws {401} Unauthorized - Invalid session
     * @throws {403} Forbidden - Not in development environment
     */
    this.app
      .route(`/api/event/delete-all/:userId`)
      .all([verifySession(), authMiddleware.verifyIsDev])
      .delete(eventController.deleteAllByUser);

    /**
     * GET /api/event/:id
     * Retrieves a specific event by ID
     *
     * PUT /api/event/:id
     * Updates an existing event
     *
     * DELETE /api/event/:id
     * Deletes a specific event
     *
     * @auth Required - Supertokens session
     * @auth Required for PUT/DELETE - Google Calendar connection
     * @param {string} id - Event ID
     * @body {Object} event - Updated event data (PUT only)
     * @returns {Object} Event data (GET) or operation result (PUT/DELETE)
     * @throws {401} Unauthorized - Invalid session
     * @throws {403} Forbidden - No Google Calendar connection (PUT/DELETE)
     * @throws {404} Not Found - Event not found
     * @throws {400} Bad Request - Invalid event data (PUT)
     */
    this.app
      .route(`/api/event/:id`)
      .all(verifySession())
      .get(eventController.readById)
      .put(requireGoogleConnectionSession, eventController.update)
      .delete(requireGoogleConnectionSession, eventController.delete);

    return this.app;
  }
}
