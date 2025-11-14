import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { Priorities } from "@core/constants/core.constants";
import { Schema_Priority } from "@core/types/priority.types";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import priorityService from "@backend/priority/services/priority.service";

describe("PriorityService", () => {
  const user = new ObjectId().toString();

  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  describe("list", () => {
    it("should return an empty array when no priorities exist for the user", async () => {
      const result = await priorityService.list(user);

      expect(result).toEqual([]);
    });

    it("should return all priorities for the user", async () => {
      const priorities = [
        { name: "Test Priority 1", user },
        { name: "Test Priority 2", user },
      ];

      await mongoService.priority.insertMany(priorities);

      const result = await priorityService.list(user);

      expect(result).toHaveLength(2);

      expect(result.map((p) => p.name)).toEqual([
        "Test Priority 1",
        "Test Priority 2",
      ]);
    });
  });

  describe("create", () => {
    it("should create a single priority and return it", async () => {
      const data = [{ name: "New Priority", user }];
      const result = await priorityService.create(data);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "New Priority",
            user: user,
            _id: expect.any(String),
          }),
        ]),
      );

      // Verify in DB
      const inDb = await mongoService.priority.findOne({
        _id: new ObjectId(result[0]?._id),
      });

      expect(inDb?.name).toBe("New Priority");
    });

    it("should create multiple priorities and return them", async () => {
      const data = [
        { name: "Priority 1", user },
        { name: "Priority 2", user },
      ];

      const result = await priorityService.create(data);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.name)).toEqual(["Priority 1", "Priority 2"]);

      // Verify in DB
      const inDb = await mongoService.priority.find({ user }).toArray();
      expect(inDb).toHaveLength(2);
    });

    it("should upsert existing priorities", async () => {
      // Insert existing
      const data: Omit<Schema_Priority, "_id"> = { name: "Existing", user };
      const created = await mongoService.priority.findOneAndReplace(
        data,
        data,
        { returnDocument: "after", upsert: true },
      );

      expect(created).toBeDefined();
      expect(created).not.toBeNull();

      const result = await priorityService.create([data]);

      // Should still have only one
      const inDb = await mongoService.priority.find({ user }).toArray();

      expect(inDb).toHaveLength(1);

      expect(result).toEqual(
        inDb.map((p) => ({
          name: p.name,
          user: p.user,
          _id: p._id.toString(),
        })),
      );
    });
  });

  describe("createDefaultPriorities", () => {
    it("should create the four default priorities for a user", async () => {
      const result = await priorityService.createDefaultPriorities(user);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
      const names = result.map((p) => p.name);
      expect(names).toEqual([
        Priorities.UNASSIGNED,
        Priorities.SELF,
        Priorities.WORK,
        Priorities.RELATIONS,
      ]);

      // Verify in DB
      const inDb = await mongoService.priority.find({ user }).toArray();
      expect(inDb).toHaveLength(4);
    });
  });

  describe("deleteAllByUser", () => {
    it("should delete all priorities for the user", async () => {
      await mongoService.priority.insertMany([
        { name: "Priority 1", user },
        { name: "Priority 2", user },
      ]);

      const result = await priorityService.deleteAllByUser(user);
      expect(result.deletedCount).toBe(2);

      // Verify DB is empty
      const inDb = await mongoService.priority.find({ user }).toArray();
      expect(inDb).toHaveLength(0);
    });

    it("should not delete priorities for other users", async () => {
      await mongoService.priority.insertMany([
        { name: "Priority 1", user },
        { name: "Priority 2", user: "other-user" },
      ]);

      await priorityService.deleteAllByUser(user);

      const inDb = await mongoService.priority
        .find({ user: "other-user" })
        .toArray();
      expect(inDb).toHaveLength(1);
    });
  });

  describe("deleteById", () => {
    it("should delete a specific priority by id for the user", async () => {
      const inserted = await mongoService.priority.insertOne({
        name: "To Delete",
        user,
      });
      const id = inserted.insertedId.toString();

      const result = await priorityService.deleteById(id, user);
      expect(result.deletedCount).toBe(1);

      // Verify deleted
      const inDb = await mongoService.priority.findOne({
        _id: mongoService.objectId(id),
      });
      expect(inDb).toBeNull();
    });

    it("should not delete if id does not belong to user", async () => {
      const inserted = await mongoService.priority.insertOne({
        name: "To Delete",
        user: "other-user",
      });
      const id = inserted.insertedId.toString();

      const result = await priorityService.deleteById(id, user);
      expect(result.deletedCount).toBe(0);

      // Verify still exists
      const inDb = await mongoService.priority.findOne({
        _id: mongoService.objectId(id),
      });
      expect(inDb).not.toBeNull();
    });
  });

  describe("readById", () => {
    it("should return the priority if it exists for the user", async () => {
      const inserted = await mongoService.priority.insertOne({
        name: "Test Priority",
        user,
      });
      const id = inserted.insertedId.toString();

      const result = await priorityService.readById(user, id);
      expect(result).toHaveProperty("name", "Test Priority");
      expect(result).toHaveProperty("user", user);
    });

    it("should return an empty object if priority does not exist", async () => {
      const result = await priorityService.readById(
        user,
        new ObjectId().toString(),
      );

      expect(result).toEqual({});
    });

    it("should return an empty object if priority exists but for another user", async () => {
      const inserted = await mongoService.priority.insertOne({
        name: "Test Priority",
        user: "other-user",
      });
      const id = inserted.insertedId.toString();

      const result = await priorityService.readById(user, id);
      expect(result).toEqual({});
    });
  });

  describe("updateById", () => {
    it("should update the priority and return the updated document", async () => {
      const inserted = await mongoService.priority.insertOne({
        name: "Old Name",
        user,
      });
      const id = inserted.insertedId.toString();

      const updateData = { name: "New Name" };
      const result = await priorityService.updateById(id, updateData, user);

      expect(result).toHaveProperty("name", "New Name");
      expect(result).toHaveProperty("_id", new ObjectId(id));

      // Verify in DB
      const inDb = await mongoService.priority.findOne({
        _id: mongoService.objectId(id),
      });
      expect(inDb?.name).toBe("New Name");
    });

    it("should throw BaseError if update fails (e.g., wrong id)", async () => {
      const updateData = { name: "New Name" };

      await expect(
        priorityService.updateById(new ObjectId().toString(), updateData, user),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Ensure id is correct",
          statusCode: 400,
        }),
      );
    });

    it("should not update if priority belongs to another user", async () => {
      const anotherUserId = new ObjectId().toString();

      const inserted = await mongoService.priority.insertOne({
        name: "Old Name",
        user: anotherUserId,
      });

      const id = inserted.insertedId.toString();

      const updateData = { name: "New Name" };

      await expect(
        priorityService.updateById(id, updateData, user),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Ensure id is correct",
          statusCode: 400,
        }),
      );

      // Verify not updated
      const inDb = await mongoService.priority.findOne({
        _id: mongoService.objectId(id),
      });

      expect(inDb?.name).toBe("Old Name");
    });
  });
});
