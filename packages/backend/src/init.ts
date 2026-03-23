// sort-imports-ignore
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

export const logger = Logger("app:root");
