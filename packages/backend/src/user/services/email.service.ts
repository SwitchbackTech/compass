import axios from "axios";
import { Logger } from "@core/logger/winston.logger";
import { ENV } from "@backend/common/constants/env.constants";
import { EmailerError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

const logger = Logger("app:emailer.service");

class EmailService {
  addToEmailList = async (email: string, firstName: string) => {
    if (!ENV.EMAILER_LIST_ID && !ENV.EMAILER_SECRET) {
      logger.warn(
        "Email service is disabled. Required environment variables are missing."
      );
      return;
    }

    const url = `https://api.convertkit.com/v3/tags/${ENV.EMAILER_LIST_ID}/subscribe?api_secret=${ENV.EMAILER_SECRET}&email=${email}&first_name=${firstName}`;

    try {
      const response = await axios.post(url);

      if (response.status !== 200) {
        throw error(
          EmailerError.AddToListFailed,
          "Failed to add email to list"
        );
        logger.error(response.data);
      }

      return response;
    } catch (e) {
      if (
        axios.isAxiosError(e) &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        e?.response?.data?.message === "API Key not valid"
      ) {
        throw error(
          EmailerError.IncorrectApiKey,
          "Incorrect API key. Please make sure environment variables beginning with EMAILER_ are set correctly or set to an empty string."
        );
      }

      throw e;
    }
  };
}

export default new EmailService();
