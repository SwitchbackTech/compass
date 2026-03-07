// sort-imports-ignore
import dotenv from "dotenv";
import moduleAlias from "module-alias";
import path from "path";

type AliasApi = {
  addAliases(aliases: Record<string, string>): void;
};
const aliasApi = moduleAlias as unknown as AliasApi;
aliasApi.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});

import { Logger } from "@core/logger/winston.logger";

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}

export const logger = Logger("app:root");
