// sort-imports-ignore
import dotenv from "dotenv";
import moduleAlias from "module-alias";
import path from "path";
moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});
// eslint-disable-next-line prettier/prettier
import { Logger } from "@core/logger/winston.logger";

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}

export const logger = Logger("app:root");
