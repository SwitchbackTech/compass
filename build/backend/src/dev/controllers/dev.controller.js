"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const dev_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/dev/services/dev.service")
);
class DevController {
  constructor() {
    this.stopAllChannelWatches = (req, res) => {
      try {
        //@ts-ignore
        const userId = req.params.userId;
        const stopResult = dev_service_1.default.stopAllChannelWatches(userId);
        //@ts-ignore
        res.promise(Promise.resolve(stopResult));
      } catch (e) {
        //@ts-ignore
        res.promise(Promise.reject(e));
      }
    };
  }
}
exports.default = new DevController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2LmNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9kZXYvY29udHJvbGxlcnMvZGV2LmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsaUdBQTJEO0FBRTNELE1BQU0sYUFBYTtJQUFuQjtRQUNFLDBCQUFxQixHQUFHLENBQUMsR0FBb0IsRUFBRSxHQUFxQixFQUFFLEVBQUU7WUFDdEUsSUFBSTtnQkFDRixZQUFZO2dCQUNaLE1BQU0sTUFBTSxHQUFXLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO2dCQUN6QyxNQUFNLFVBQVUsR0FBRyxxQkFBVSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM1RCxZQUFZO2dCQUNaLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2FBQzFDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsWUFBWTtnQkFDWixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQUVELGtCQUFlLElBQUksYUFBYSxFQUFFLENBQUMifQ==
