import { Response } from "express";

interface CustomResponse extends Response {
  customProperty?: string;
}

// WIP: extend the express Response so TS stops complaining about res.promise()
const myController = (
  req: Request,
  res: CustomResponse,
  next: NextFunction
) => {
  res.customProperty = "Some thing";
  /* Other code go here */
};
