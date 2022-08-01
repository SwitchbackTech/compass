import { Schema_User } from "@core/types/user.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

export const findCompassUser = async (googleId: string) => {
  const user = (await mongoService.db.collection(Collections.USER).findOne({
    googleId,
  })) as Schema_User | null;

  return { userExists: user !== null, user };
};

type Ids_User = "email" | "_id" | "google.googleId";

export const findCompassUserBy = async (key: Ids_User, value: string) => {
  const filter = _getIdFilter(key, value);

  const user = (await mongoService.db
    .collection(Collections.USER)
    .findOne(filter)) as Schema_User;

  return { userExists: user !== null, user };
};

export const findCompassUsersBy = async (key: Ids_User, value: string) => {
  const filter = _getIdFilter(key, value);

  const users = await mongoService.db
    .collection(Collections.USER)
    .find(filter)
    .toArray();

  return users;
};

const _getIdFilter = (key: string, value: string) => {
  if (key === "_id") {
    return { _id: mongoService.objectId(value) };
  }
  return { [key]: value };
};
