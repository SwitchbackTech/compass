import { ClientSession } from "mongodb";
import { Priorities } from "@core/constants/core.constants";
import { BaseError } from "@core/errors/errors.base";
import { PriorityReq, Schema_Priority } from "@core/types/priority.types";
import mongoService from "@backend/common/services/mongo.service";

class PriorityService {
  async list(userId: string) {
    const filter = { user: userId };

    const allPriorities = await mongoService.priority.find(filter).toArray();

    return allPriorities;
  }

  async create(
    data: Array<Omit<Schema_Priority, "_id">>,
    session?: ClientSession,
  ): Promise<Schema_Priority[]> {
    const bulkUpsert = mongoService.priority.initializeUnorderedBulkOp();

    data.forEach(({ name, user, ...item }) => {
      bulkUpsert
        .find({ name, user })
        .upsert()
        .update({ $setOnInsert: { name, user }, $set: item });
    });

    await bulkUpsert.execute({ session });

    const result = await mongoService.priority
      .find(
        { $or: data.map(({ name, user }) => ({ name, user })) },
        { session },
      )
      .toArray();

    return result.map(({ _id, ...data }) => ({ ...data, _id: _id.toString() }));
  }

  async createDefaultPriorities(user: string, session?: ClientSession) {
    return await this.create(
      [
        { name: Priorities.UNASSIGNED, user },
        { name: Priorities.SELF, user },
        { name: Priorities.WORK, user },
        { name: Priorities.RELATIONS, user },
      ],
      session,
    );
  }

  async deleteAllByUser(userId: string) {
    const filter = { user: { $eq: userId } };

    const response = await mongoService.priority.deleteMany(filter);
    return response;
  }

  async deleteById(id: string, userId: string) {
    const filter = {
      _id: { $eq: mongoService.objectId(id) },
      user: { $eq: userId },
    };

    const response = await mongoService.priority.deleteOne(filter);
    return response;
  }

  async readById(
    userId: string,
    id: string,
  ): Promise<Schema_Priority | object> {
    const filter = {
      _id: mongoService.objectId(id),
      user: userId,
    };

    const priority = await mongoService.priority.findOne(filter);

    if (priority === null) {
      return {};
    }

    return priority;
  }

  async updateById(id: string, priority: PriorityReq, userId: string) {
    const response = await mongoService.priority.findOneAndUpdate(
      { _id: { $eq: mongoService.objectId(id) }, user: { $eq: userId } },
      { $set: priority },
      { returnDocument: "after" },
    );

    if (!response) {
      throw new BaseError("Update Failed", "Ensure id is correct", 400, true);
    }

    return response as unknown as Schema_Priority;
  }
}

export default new PriorityService();
