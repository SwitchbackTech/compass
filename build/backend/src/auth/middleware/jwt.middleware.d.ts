import express from "express";
declare class JwtMiddleware {
  verifyTokenAndSaveUserId: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => express.Response<any, Record<string, any>> | undefined;
  /***************************************** */
  /***************************************** */
  verifyRefreshBodyField(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void | express.Response<any, Record<string, any>>;
  validRefreshNeeded(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void | express.Response<any, Record<string, any>>>;
  validJWTNeeded(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): express.Response<any, Record<string, any>> | undefined;
}
declare const _default: JwtMiddleware;
export default _default;
//# sourceMappingURL=jwt.middleware.d.ts.map
