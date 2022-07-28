import { NodeEnv } from "@core/constants/core.constants";

export const isDev = (nodeEnv: NodeEnv) => nodeEnv === NodeEnv.Development;
