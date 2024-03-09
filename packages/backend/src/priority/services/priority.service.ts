import {
  Schema_Priority,
  PriorityReq,
  PriorityReqUser,
} from "@core/types/priority.types";
import { Priorities } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { BaseError } from "@core/errors/errors.base";
import { colorNameByPriority } from "@core/constants/colors";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

import { mapPriorityData } from "./priority.service.helpers";

class PriorityService {
  async list(userId: string) {
    const filter = { user: userId };

    const allPriorities = await mongoService.db
      .collection(Collections.PRIORITY)
      .find(filter)
      .toArray();

    return allPriorities;
  }

  async create(
    userId: string,
    data: PriorityReq | PriorityReqUser[]
  ): Promise<Schema_Priority | Schema_Priority[]> {
    if (data instanceof Array) {
      const response = await mongoService.db
        .collection(Collections.PRIORITY)
        .insertMany(data);

      const priorities = mapPriorityData(response.insertedIds, data, userId);
      return priorities;
    } else {
      const priorityExists = await mongoService.recordExists(
        Collections.PRIORITY,
        {
          user: userId,
          name: data.name,
        }
      );

      if (priorityExists) {
        throw new BaseError(
          "Priority Exists",
          `${data.name} already exists`,
          Status.NOT_IMPLEMENTED,
          true
        );
      }

      const doc = Object.assign({}, data, { user: userId });
      const response = await mongoService.db
        .collection(Collections.PRIORITY)
        .insertOne(doc);

      const priority: Schema_Priority = {
        _id: response.insertedId.toString(),
        user: userId,
        name: data.name,
        color: data.color,
      };

      return priority;
    }
  }

  async createDefaultPriorities(userId: string) {
    return await this.create(userId, [
      {
        color: colorNameByPriority.unassigned,
        name: Priorities.UNASSIGNED,
        user: userId,
      },
      {
        color: colorNameByPriority.self,
        name: Priorities.SELF,
        user: userId,
      },
      {
        color: colorNameByPriority.work,
        name: Priorities.WORK,
        user: userId,
      },
      {
        color: colorNameByPriority.relationships,
        name: Priorities.RELATIONS,
        user: userId,
      },
    ]);
  }

  async deleteAllByUser(userId: string) {
    const filter = { user: { $eq: userId } };

    const response = await mongoService.db
      .collection(Collections.PRIORITY)
      .deleteMany(filter);
    return response;
  }

  async deleteById(id: string, userId: string) {
    const filter = {
      _id: { $eq: mongoService.objectId(id) },
      user: { $eq: userId },
    };

    const response = await mongoService.db
      .collection(Collections.PRIORITY)
      .deleteOne(filter);
    return response;
  }

  async readById(
    userId: string,
    id: string
  ): Promise<Schema_Priority | object> {
    const filter = {
      _id: mongoService.objectId(id),
      user: userId,
    };

    const priority = await mongoService.db
      .collection(Collections.PRIORITY)
      .findOne(filter);

    if (priority === null) {
      return {};
    }

    return priority;
  }

  async updateById(id: string, priority: PriorityReq, userId: string) {
    const response = await mongoService.db
      .collection(Collections.PRIORITY)
      .findOneAndUpdate(
        { _id: { $eq: mongoService.objectId(id) }, user: { $eq: userId } },
        { $set: priority },
        { returnDocument: "after" }
      );

    if (!response) {
      return new BaseError("Update Failed", "Ensure id is correct", 400, true);
    }

    return response as unknown as Schema_Priority;
  }
}

export default new PriorityService();
