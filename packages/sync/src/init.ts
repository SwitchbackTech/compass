import dotenv from 'dotenv';
import moduleAlias from 'module-alias';
import { ENV } from '../../common/src/constants/env.constants';

moduleAlias.addAliases({
  '@sync': `${__dirname}`,
});

const dotenvResult = dotenv.config();
if (dotenvResult.error) {
  throw dotenvResult.error;
}

console.log(ENV);
