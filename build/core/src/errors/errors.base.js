"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseError = void 0;
class BaseError extends Error {
  constructor(name, description, statusCode, isOperational) {
    super(description);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.description = description;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this);
  }
}
exports.BaseError = BaseError;
/*example of how to extend
export class APIError extends BaseError {
  constructor(
    name: string,
    statusCode = StatusCodes.INTERNAL_SERVER,
    description = "Internal server error",
    isOperational = true
  ) {
    super(name, statusCode, description, isOperational);
  }
}
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3JzLmJhc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lcnJvcnMvZXJyb3JzLmJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxTQUFVLFNBQVEsS0FBSztJQU1sQyxZQUNFLElBQVksRUFDWixXQUFtQixFQUNuQixVQUFrQixFQUNsQixhQUFzQjtRQUV0QixLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUVsRCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztRQUMvQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUVuQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNGO0FBdEJELDhCQXNCQztBQUVEOzs7Ozs7Ozs7OztFQVdFIn0=
