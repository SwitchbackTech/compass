import cors from "cors";
// var cors = require("cors");
const allowedOrigins = process.env.CORS ? process.env.CORS.split(",") : [];
console.log("$$ allowed origins:", allowedOrigins);

module.exports = cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    console.log("reminder: all origins allowed - yikes");

    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = `The CORS policy for this site does not allow access from ${origin}`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
});
