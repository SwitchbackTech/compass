import dotenv from 'dotenv';
import moduleAlias from 'module-alias';

moduleAlias.addAliases({
  '@sync': `${__dirname}`,
});

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}
