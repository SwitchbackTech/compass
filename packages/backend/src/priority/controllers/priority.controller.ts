//@ts-nocheck
import { SessionRequest } from "supertokens-node/framework/express";
import { Res_Promise } from "@backend/common/types/express.types";
import { PriorityReq } from "@core/types/priority.types";

import priorityService from "../services/priority.service";

class PriorityController {
  create = async (req: SReqBody<PriorityReq>, res: Res_Promise) => {
    const userId = req.session?.getUserId();
    const data = req.body;
    const createRes = await priorityService.create(userId, data);
    res.promise(createRes);
  };

  delete = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    const priorityId: string = req.params.id;
    const deleteResponse = await priorityService.deleteById(priorityId, userId);

    res.promise(deleteResponse);
  };

  readAll = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId();
    const priorities = await priorityService.list(userId);
    res.promise(priorities);
  };

  readById = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId();
    const priority = await priorityService.readById(userId, req.params.id);
    res.promise(priority);
  };

  update = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    const priorityId: string = req.params.id;
    const priority: PriorityReq = req.body;
    const response = await priorityService.updateById(
      priorityId,
      priority,
      userId
    );

    res.promise(response);
  };
}

export default new PriorityController();
