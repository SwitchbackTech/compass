import jwt, { TokenExpiredError } from "jsonwebtoken";
import { JwtToken, Result_Token_Validate } from "@core/types/jwt.types";
import { ENV } from "@backend/common/constants/env.constants";

export const parseBearerToken = (bearerToken: string | undefined) => {
  // example: Bearer tokenpart1.part2.part3
  const token = bearerToken?.split("Bearer ").join("").trim();

  if (!token || token === "null") {
    return { tokenIncluded: false };
  }
  return { tokenIncluded: true, token };
};

export const createToken = (type: "access" | "refresh", userId: string) => {
  const expiry =
    type === "access" ? ENV.ACCESS_TOKEN_LIFE : ENV.REFRESH_TOKEN_LIFE;
  const secret =
    type === "access" ? ENV.ACCESS_TOKEN_SECRET : ENV.REFRESH_TOKEN_SECRET;

  const token = jwt.sign({ _id: userId }, secret, {
    algorithm: "HS256",
    expiresIn: expiry,
  });

  return token;
};

export const validateToken = (token: string): Result_Token_Validate => {
  if (!token) {
    return { refreshNeeded: true };
  }

  try {
    console.log("TODO: Validate token");
    const payload = jwt.verify(token, ENV.ACCESS_TOKEN_SECRET) as JwtToken;

    return { payload, refreshNeeded: false };
  } catch (e) {
    if (e instanceof TokenExpiredError) {
      // return 401 code //--
      return { refreshNeeded: true };
    } else {
      return { error: e, refreshNeeded: true };
    }
  }
};
