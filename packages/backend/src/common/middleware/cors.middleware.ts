import cors from "cors";

const allowedOrigins = process.env["CORS"]
  ? process.env["CORS"].split(",")
  : [];

const corsWhitelist = cors({
  credentials: true,
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `The CORS policy for this site does not allow access from ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
});

export default corsWhitelist;
