import cors from "cors";
declare const corsWhitelist: (
  req: cors.CorsRequest,
  res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
  },
  next: (err?: any) => any
) => void;
export default corsWhitelist;
//# sourceMappingURL=cors.middleware.d.ts.map
