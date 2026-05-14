import cors from "cors";
import { CONFIG } from "../constants/config.constants";

const corsWhitelist = cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (CONFIG.ORIGINS_ALLOWED.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
});

export default corsWhitelist;
