import dotenv from "dotenv";
import moduleAlias from "module-alias";
import path from "path";

moduleAlias.addAliases({
  "@backend": `${__dirname}`,
  "@core": `${path.resolve(__dirname, "../../core/src")}`,
});

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
