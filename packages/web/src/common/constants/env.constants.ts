import { isDev } from "@core/util/env.util";

export const IS_DEV = isDev(process.env["NODE_ENV"]);
