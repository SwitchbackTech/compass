import { Schema_Priority, PriorityReq } from "@core/types/priority.types";
import { BaseError } from "@core/errors/errors.base";

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

  async create(
    userId: string,
    data: PriorityReq | PriorityReq[]
  ): Promise<Schema_Priority | Schema_Priority[] | BaseError> {
    if (data instanceof Array) {
      // TODO catch BulkWriteError
      // TODO confirm none exist with same name
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
        return new BaseError(
          "Priority Exists",
          `${data.name} already exists`,
          400,
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

  async updateById(
    id: string,
    priority: PriorityReq
  ): Promise<Schema_Priority | BaseError> {
    const response = await mongoService.db
      .collection(Collections.PRIORITY)
      .findOneAndUpdate(
        { _id: mongoService.objectId(id) },
        { $set: priority },
        { returnDocument: "after" } // the new document
      );

    if (response.value === null || response.idUpdates === 0) {
      return new BaseError("Update Failed", "Ensure id is correct", 400, true);
    }

    const updatedPriority = response.value;
    return updatedPriority;
  }

  async deleteById(id: string) {
    //TODO add user to filter (?)
    const filter = { _id: mongoService.objectId(id) };
    const response = await mongoService.db
      .collection(Collections.PRIORITY)
      .deleteOne(filter);
    return response;
  }
}

export default new PriorityService();
