import express from "express";

import { PriorityReq } from "@compass/core/src/types/priority.types";

import priorityService from "../services/priority.service";

class PriorityController {
  create = async (req: express.Request, res: express.Response) => {
    const userId: string = res.locals.user.id;
    const data: PriorityReq = req.body;
    const createRes = await priorityService.create(userId, data);
    res.promise(Promise.resolve(createRes));
  };

  delete = async (req: express.Request, res: express.Response) => {
    const priorityId: string = req.params.id;
    const deleteResponse = await priorityService.deleteById(priorityId);
    res.promise(Promise.resolve(deleteResponse));
  };

  readAll = async (req: express.Request, res: express.Response) => {
    const userId = res.locals.user.id;
    const priorities = await priorityService.list(userId);
    res.promise(Promise.resolve(priorities));
  };

  readById = async (req: express.Request, res: express.Response) => {
    const userId = res.locals.user.id;
    const priority = await priorityService.readById(userId, req.params.id);
    res.promise(Promise.resolve(priority));
  };

  update = async (req: express.Request, res: express.Response) => {
    const priorityId: string = req.params.id;
    const priority: PriorityReq = req.body;
    const response = await priorityService.updateById(priorityId, priority);
    res.promise(Promise.resolve(response));
  };
}

export default new PriorityController();
