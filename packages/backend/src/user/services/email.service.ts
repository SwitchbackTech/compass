import axios from "axios";
import { Logger } from "@core/logger/winston.logger";
import { ENV } from "@backend/common/constants/env.constants";
import { EmailerError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

const logger = Logger("app:emailer.service");

class EmailService {
  addToEmailList = async (email: string, firstName: string) => {
    const url = `https://api.convertkit.com/v3/tags/${ENV.EMAILER_LIST_ID}/subscribe?api_secret=${ENV.EMAILER_SECRET}&email=${email}&first_name=${firstName}`;

    const response = await axios.post(url);

    if (response.status !== 200) {
      throw error(EmailerError.AddToListFailed, "Failed to add email to list");
      logger.error(response.data);
    }

    return response;
  };
}

export default new EmailService();
