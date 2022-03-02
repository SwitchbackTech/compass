//@ts-nocheck
import express from "express";
import { Res } from "@core/types/express.types";
import { PriorityReq } from "@core/types/priority.types";

import priorityService from "../services/priority.service";

class PriorityController {
  create = async (req: express.Request, res: Res) => {
    const userId: string = res.locals.user.id;
    const data: PriorityReq = req.body;
    const createRes = await priorityService.create(userId, data);
    //@ts-ignore
    res.promise(Promise.resolve(createRes));
  };

  delete = async (req: express.Request, res: express.Response) => {
    //@ts-ignore
    const priorityId: string = req.params.id;
    const deleteResponse = await priorityService.deleteById(priorityId);
    //@ts-ignore
    res.promise(Promise.resolve(deleteResponse));
  };

  readAll = async (req: express.Request, res: express.Response) => {
    const userId = res.locals.user.id;
    const priorities = await priorityService.list(userId);
    res.promise(Promise.resolve(priorities));
  };

  readById = async (req: express.Request, res: express.Response) => {
    //@ts-ignore
    const userId = res.locals.user.id;
    const priority = await priorityService.readById(userId, req.params.id);
    res.promise(Promise.resolve(priority));
  };

  update = async (req: express.Request, res: express.Response) => {
    //@ts-ignore
    const priorityId: string = req.params.id;
    //@ts-ignore
    const priority: PriorityReq = req.body;
    //@ts-ignore
    const response = await priorityService.updateById(priorityId, priority);
    //@ts-ignore
    res.promise(Promise.resolve(response));
  };
}

export default new PriorityController();
