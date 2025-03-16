import { NodeEnv } from "@core/constants/core.constants";
import { isDev } from "@core/util/env.util";

export const devAlert = (message: string) => {
  if (isDev(process.env["NODE_ENV"] as NodeEnv)) {
    alert(message);
  } else {
    console.warn(message);
  }
};
