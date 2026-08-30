import { type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import { zObjectId } from "@core/types/type.utils";
import { toBookingErrorResponse } from "@backend/booking/booking.error";
import bookingPageService from "@backend/booking/services/booking-page.service";

class BookingController {
  getPage = async (req: SessionRequest, res: Response) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const response = await bookingPageService.getAdminPage(userId);
      res.status(Status.OK).json(response);
    } catch (error) {
      const { status, body } = toBookingErrorResponse(error);
      res.status(status).json(body);
    }
  };

  putPage = async (req: SessionRequest, res: Response) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId());
      const response = await bookingPageService.putAdminPage(userId, req.body);
      res.status(Status.OK).json(response);
    } catch (error) {
      const { status, body } = toBookingErrorResponse(error);
      res.status(status).json(body);
    }
  };
}

export default new BookingController();
