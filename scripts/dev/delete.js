#!/usr/bin/env node
const inquirer = require("inquirer");

module.exports = {
  deleteUserData(accessToken) {
    const userName = "vendors";
    const questions = [
      {
        type: "input",
        name: "confirmUser",
        message: `This will delete all ${userName}'s data. U still good?`,
      },
    ];
    inquirer.prompt(questions).then((answers) => {
      if (answers.confirmUser === "yes") {
        console.log(`deleting ${userName}'s data ...`);
      }
    });
  },
};
