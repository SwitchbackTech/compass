"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Collections = void 0;
/* DB collection names*/
const common_helpers_1 = require("../helpers/common.helpers");
const useDevCollections = common_helpers_1.isDev();
exports.Collections = {
    CALENDARLIST: useDevCollections ? "dev.calendarlist" : "calendarlist.v2",
    EVENT: useDevCollections ? "dev.event" : "event.v2",
    OAUTH: useDevCollections ? "dev.oauth" : "oauth.v2",
    PRIORITY: useDevCollections ? "dev.priority" : "priority.v2",
    USER: useDevCollections ? "dev.user" : "user.v2",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY29tbW9uL2NvbnN0YW50cy9jb2xsZWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3QkFBd0I7QUFDeEIsOERBQWtEO0FBRWxELE1BQU0saUJBQWlCLEdBQUcsc0JBQUssRUFBRSxDQUFDO0FBRXJCLFFBQUEsV0FBVyxHQUFHO0lBQ3pCLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtJQUN4RSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVTtJQUNuRCxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsVUFBVTtJQUNuRCxRQUFRLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsYUFBYTtJQUM1RCxJQUFJLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUztDQUNqRCxDQUFDIn0=