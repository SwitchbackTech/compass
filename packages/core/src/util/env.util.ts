import { NodeEnv } from "@core/constants/core.constants";

export const isDev = (nodeEnv: NodeEnv | string) =>
  nodeEnv === NodeEnv.Development;
