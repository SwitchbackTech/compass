import dotenv from "dotenv";
import moduleAlias from "module-alias";
import path from "path";
// eslint-disable-next-line prettier/prettier
import { Logger } from "@core/logger/winston.logger";

moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}

export const logger = Logger("app:root");
