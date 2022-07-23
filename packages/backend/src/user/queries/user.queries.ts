import { Schema_User } from "@core/types/user.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export const findCompassUser = async (googleId: string) => {
  const user = (await mongoService.db.collection(Collections.USER).findOne({
    googleId,
  })) as Schema_User | null;

  return { userExists: user !== null, user };
};

type Ids_User = "email" | "_id" | "googleId";

export const findCompassUserBy = async (key: Ids_User, value: string) => {
  let filter;

  if (key === "_id") {
    filter = { _id: mongoService.objectId(value) };
  } else {
    filter = { [key]: value };
  }

  const user = (await mongoService.db
    .collection(Collections.USER)
    .findOne(filter)) as Schema_User;

  return { userExists: user !== null, user };
};
