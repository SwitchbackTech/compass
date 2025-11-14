import { Request } from "express";
import { SessionRequest } from "supertokens-node/framework/express";
import { PriorityReq } from "@core/types/priority.types";
import { zObjectId } from "@core/types/type.utils";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import priorityService from "@backend/priority/services/priority.service";

class PriorityController {
  create = async (req: SReqBody<PriorityReq>, res: Res_Promise) => {
    const user = zObjectId.parse(req.session?.getUserId()).toString();
    const data = req.body;
    const createRes = await priorityService.create([{ ...data, user }]);
    res.promise(createRes[0]);
  };

  delete = async (req: Request<{ id: string }>, res: Res_Promise) => {
    const user = zObjectId.parse(req.session?.getUserId()).toString();
    const priorityId: string = req.params.id;
    const deleteResponse = await priorityService.deleteById(priorityId, user);

    res.promise(deleteResponse);
  };

  readAll = async (req: SessionRequest, res: Res_Promise) => {
    const user = zObjectId.parse(req.session?.getUserId()).toString();
    const priorities = await priorityService.list(user);
    res.promise(priorities);
  };

  readById = async (req: Request<{ id: string }>, res: Res_Promise) => {
    const user = zObjectId.parse(req.session?.getUserId()).toString();
    const priority = await priorityService.readById(user, req.params.id);
    res.promise(priority);
  };

  update = async (req: Request<{ id: string }>, res: Res_Promise) => {
    const user = zObjectId.parse(req.session?.getUserId()).toString();
    const priorityId = req.params.id;
    const priority: PriorityReq = req.body;
    const response = await priorityService.updateById(
      priorityId,
      priority,
      user,
    );

    res.promise(response);
  };
}

export default new PriorityController();
