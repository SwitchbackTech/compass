// sort-imports-ignore
import dotenv from "dotenv";
import moduleAlias from "module-alias";
import path from "path";

moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});

const dotenvResult = dotenv.config();

import { Logger } from "@core/logger/winston.logger";

if (dotenvResult.error) {
  throw dotenvResult.error;
}

export const logger = Logger("app:root");
