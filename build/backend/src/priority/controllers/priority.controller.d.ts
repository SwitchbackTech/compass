import express from "express";
import { Res } from "@core/types/express.types";
declare class PriorityController {
  create: (req: express.Request, res: Res) => Promise<void>;
  delete: (req: express.Request, res: express.Response) => Promise<void>;
  readAll: (req: express.Request, res: express.Response) => Promise<void>;
  readById: (req: express.Request, res: express.Response) => Promise<void>;
  update: (req: express.Request, res: express.Response) => Promise<void>;
}
declare const _default: PriorityController;
export default _default;
//# sourceMappingURL=priority.controller.d.ts.map
