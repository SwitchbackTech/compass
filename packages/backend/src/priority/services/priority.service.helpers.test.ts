import { ObjectId } from "mongodb";
import { InsertedIds } from "@core/types/mongo.types";
import { PriorityReq, Schema_Priority } from "@core/types/priority.types";
import { mapPriorityData } from "@backend/priority/services/priority.service.helpers";

test("Priority ids mapped in correct order", () => {
  const insertedIds: InsertedIds = {
    [0]: new ObjectId(),
    [1]: new ObjectId(),
    [2]: new ObjectId(),
  };
  const priorityData: PriorityReq[] = [
    { name: "foo", color: "bar" },
    { name: "boz", color: "bim" },
    { name: "mooo", color: "koy" },
  ];

  const priorities: Schema_Priority[] = mapPriorityData(
    insertedIds,
    priorityData,
    "user123",
  );

  expect(priorities[0]._id).toEqual(insertedIds[0].toString());
  expect(priorities[1]._id).toEqual(insertedIds[1].toString());
  expect(priorities[2]._id).toEqual(insertedIds[2].toString());
});
