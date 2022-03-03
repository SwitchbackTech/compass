"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collections = void 0;
/* DB collection names*/
const common_helpers_1 = require("../helpers/common.helpers");
const useDevCollections = (0, common_helpers_1.isDev)();
exports.Collections = {
  CALENDARLIST: useDevCollections ? "dev.calendarlist" : "calendarlist",
  DEV_WATCHLOG_GCAL: "dev.watch.gcal",
  EVENT: useDevCollections ? "dev.event" : "event",
  OAUTH: useDevCollections ? "dev.oauth" : "oauth",
  PRIORITY: useDevCollections ? "dev.priority" : "priority",
  USER: useDevCollections ? "dev.user" : "user",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9jb21tb24vY29uc3RhbnRzL2NvbGxlY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdCQUF3QjtBQUN4Qiw4REFBa0Q7QUFFbEQsTUFBTSxpQkFBaUIsR0FBRyxJQUFBLHNCQUFLLEdBQUUsQ0FBQztBQUVyQixRQUFBLFdBQVcsR0FBRztJQUN6QixZQUFZLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxjQUFjO0lBQ3JFLGlCQUFpQixFQUFFLGdCQUFnQjtJQUNuQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTztJQUNoRCxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTztJQUNoRCxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsVUFBVTtJQUN6RCxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTTtDQUM5QyxDQUFDIn0=
