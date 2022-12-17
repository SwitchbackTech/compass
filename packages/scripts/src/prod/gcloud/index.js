const axios = require("axios");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (msg) => {
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);
  }
};

exports.runSyncMaintenance = (req, res) => {
  const domain = req.query.domain;
  const prefix = domain.includes("localhost") ? "http" : "https";

  const config = {
    method: "post",
    url: `${prefix}://${domain}/api/sync/maintain-all`,
    headers: {
      "x-comp-token": process.env.COMPASS_SYNC_TOKEN,
    },
  };

  const msg = {
    to: "hello@switchback.tech",
    from: "***REMOVED***",
  };

  axios(config)
    .then(async function (response) {
      console.log(JSON.stringify(response.data));

      await sendEmail({
        ...msg,
        subject: "Sync Maintenace: SUCCESS",
        text: JSON.stringify(response.data),
      });

      res.send(response.data);
    })
    .catch(async function (error) {
      console.log(error);
      await sendEmail({
        ...msg,
        subject: "Sync Maintenance: FAILED",
        text: JSON.stringify(error),
      });
      res.send(error);
    });
};
