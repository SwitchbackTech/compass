import jwt, { TokenExpiredError } from "jsonwebtoken";
import { ENV } from "@backend/common/constants/env.constants";
/** $$ delete?
export const getJwt = (user: string) => {
  const accessToken = jwt.sign({ _id: "userid" }, ENV.ACCESS_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: ENV.ACCESS_TOKEN_LIFE,
  });
};

const token = jwt.sign(req.body, jwtSecret, {
  expiresIn: tokenExpirationInSeconds,
});

const newToken = jwt.sign(
  { _id: payload["_id"] },
  process.env["ACCESS_TOKEN_SECRET"],
  {
    algorithm: "HS256",
    expiresIn: process.env["ACCESS_TOKEN_LIFE"],
  }
);
*/

// $$ add type
export const validateToken = (token: string) => {
  if (!token) {
    return { refreshNeeded: true };
  }

  try {
    const payload = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET);
    return { payload };
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      return { refreshNeeded: true };
    } else {
      return { error: e };
    }
  }
};
