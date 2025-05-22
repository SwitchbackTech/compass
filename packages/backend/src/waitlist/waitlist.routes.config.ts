import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { WaitlistController } from "./controller/waitlist.controller";

export class WaitlistRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "WaitlistRoutes");
  }

  configureRoutes() {
    this.app
      .route("/api/waitlist")
      .post(WaitlistController.addToWaitlist)
      .get(WaitlistController.status);
    return this.app;
  }
}
