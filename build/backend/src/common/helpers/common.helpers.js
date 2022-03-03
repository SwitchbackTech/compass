"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yearsAgo = exports.isDev = void 0;
const backend_constants_1 = require("../constants/backend.constants");
const isDev = () => {
  return process.env["NODE_ENV"] === backend_constants_1.NodeEnv.Development;
};
exports.isDev = isDev;
const yearsAgo = (numYears) => {
  return new Date(new Date().setFullYear(new Date().getFullYear() - numYears));
};
exports.yearsAgo = yearsAgo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9jb21tb24vaGVscGVycy9jb21tb24uaGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzRUFBeUQ7QUFFbEQsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFO0lBQ3hCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSywyQkFBTyxDQUFDLFdBQVcsQ0FBQztBQUN6RCxDQUFDLENBQUM7QUFGVyxRQUFBLEtBQUssU0FFaEI7QUFFSyxNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtJQUMzQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUMvRSxDQUFDLENBQUM7QUFGVyxRQUFBLFFBQVEsWUFFbkIifQ==
