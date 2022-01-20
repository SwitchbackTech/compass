"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yearsAgo = exports.isDev = void 0;
const isDev = () => {
    return process.env.ENV === "dev";
};
exports.isDev = isDev;
const yearsAgo = (numYears) => {
    return new Date(new Date().setFullYear(new Date().getFullYear() - numYears));
};
exports.yearsAgo = yearsAgo;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY29tbW9uL2hlbHBlcnMvY29tbW9uLmhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQU8sTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFO0lBQ3hCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssS0FBSyxDQUFDO0FBQ25DLENBQUMsQ0FBQztBQUZXLFFBQUEsS0FBSyxTQUVoQjtBQUVLLE1BQU0sUUFBUSxHQUFHLENBQUMsUUFBZ0IsRUFBRSxFQUFFO0lBQzNDLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUMsQ0FBQztBQUZXLFFBQUEsUUFBUSxZQUVuQiJ9