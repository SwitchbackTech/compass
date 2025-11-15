import { getIdFilter } from "@backend/common/helpers/mongo.utils";
import mongoService from "@backend/common/services/mongo.service";

type Ids_User = "email" | "_id" | "google.googleId";

export const findCompassUserBy = async (key: Ids_User, value: string) => {
  const filter = getIdFilter(key, value);
  const user = await mongoService.user.findOne(filter);

  return user;
};

export const findCompassUsersBy = async (key: Ids_User, value: string) => {
  const filter = getIdFilter(key, value);

  const users = await mongoService.user.find(filter).toArray();

  return users;
};
