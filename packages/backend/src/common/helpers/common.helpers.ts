import { NodeEnv } from "@backend/common/constants/backend.constants";

export const isDev = () => {
  return process.env["NODE_ENV"] === NodeEnv.Development;
};

export const yearsAgo = (numYears: number) => {
  return new Date(new Date().setFullYear(new Date().getFullYear() - numYears));
};
