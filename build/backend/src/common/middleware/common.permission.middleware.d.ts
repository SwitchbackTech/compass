import express from "express";
import { PermissionFlag } from "./common.permissionflag.enum";
declare class CommonPermissionMiddleware {
  permissionFlagRequired(
    requiredPermissionFlag: PermissionFlag
  ): (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => void;
}
declare const _default: CommonPermissionMiddleware;
export default _default;
//# sourceMappingURL=common.permission.middleware.d.ts.map
