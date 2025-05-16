import express from "express";
import { CommonRoutesConfig } from "@backend/common/common.routes.config";
import { WaitlistController } from "./controller/waitlist.controller";

export class WaitlistRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, "WaitlistRoutes");
  }

  configureRoutes() {
    this.app.post("/api/waitlist/v0", WaitlistController.addToWaitlist);
    return this.app;
  }
}
