//@ts-nocheck
import express from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { Res } from "@backend/common/types/express.types";
import { PriorityReq } from "@core/types/priority.types";

import priorityService from "../services/priority.service";

class PriorityController {
  create = async (req: SReqBody<PriorityReq>, res: Res) => {
    const userId = req.session?.getUserId();
    const data = req.body;
    const createRes = await priorityService.create(userId, data);
    //@ts-ignore
    res.promise(Promise.resolve(createRes));
  };

  delete = async (req: SessionRequest, res: express.Response) => {
    const userId = req.session?.getUserId();
    const priorityId: string = req.params.id;
    const deleteResponse = await priorityService.deleteById(priorityId, userId);
    //@ts-ignore
    res.promise(Promise.resolve(deleteResponse));
  };

  readAll = async (req: SessionRequest, res: express.Response) => {
    const userId = req.session?.getUserId();
    const priorities = await priorityService.list(userId);
    res.promise(Promise.resolve(priorities));
  };

  readById = async (req: SessionRequest, res: express.Response) => {
    const userId = req.session?.getUserId();
    const priority = await priorityService.readById(userId, req.params.id);
    res.promise(Promise.resolve(priority));
  };

  update = async (req: SessionRequest, res: express.Response) => {
    const userId = req.session?.getUserId();
    //@ts-ignore
    const priorityId: string = req.params.id;
    //@ts-ignore
    const priority: PriorityReq = req.body;
    //@ts-ignore
    const response = await priorityService.updateById(
      priorityId,
      priority,
      userId
    );
    //@ts-ignore
    res.promise(Promise.resolve(response));
  };
}

export default new PriorityController();
