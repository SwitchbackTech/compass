"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapUser = void 0;
// Map  user object given by google signin to our schema //
var MapUser;
(function (MapUser) {
  MapUser.toCompass = (userData) => {
    return {
      email: userData.user.email,
      name: userData.user.name,
      picture: userData.user.picture,
      googleId: userData.user.id,
    };
  };
})((MapUser = exports.MapUser || (exports.MapUser = {})));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwLnVzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9tYXBwZXJzL21hcC51c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDJEQUEyRDtBQUMzRCxJQUFpQixPQUFPLENBU3ZCO0FBVEQsV0FBaUIsT0FBTztJQUNULGlCQUFTLEdBQUcsQ0FBQyxRQUE4QixFQUFFLEVBQUU7UUFDMUQsT0FBTztZQUNMLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUs7WUFDMUIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSTtZQUN4QixPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPO1lBQzlCLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7U0FDM0IsQ0FBQztJQUNKLENBQUMsQ0FBQztBQUNKLENBQUMsRUFUZ0IsT0FBTyxHQUFQLGVBQU8sS0FBUCxlQUFPLFFBU3ZCIn0=
