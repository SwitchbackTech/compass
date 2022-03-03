import express from "express";
declare class AuthController {
  demoCreateJWT(
    req: express.Request,
    res: express.Response
  ): Promise<express.Response<any, Record<string, any>>>;
  createJwt(req: express.Request, res: express.Response): void;
  checkOauthStatus: (
    req: express.Request,
    res: express.Response
  ) => Promise<void>;
  getOauthUrl: (req: express.Request, res: express.Response) => void;
  loginWithPassword(req: express.Request, res: express.Response): void;
  loginAfterOauthSucceeded: (
    req: express.Request,
    res: express.Response
  ) => Promise<void>;
}
declare const _default: AuthController;
export default _default;
//# sourceMappingURL=auth.controller.d.ts.map
