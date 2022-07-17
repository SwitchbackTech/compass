#!/usr/bin/env node
/* eslint-disable no-console */
const inquirer = require("inquirer");
const { program } = require("commander");

const d = require("./delete");

/* setup CLI */
program.option("-d, --delete", "deletes users data from compass database");

program.parse(process.argv);
const options = program.opts();

if (options.delete) {
  /* confirm */
  const questions = [
    {
      type: "input",
      name: "confirmed",
      message: `Are you sure you want to delete all of your user data? [enter: "yes"]`,
    },
    { type: "input", name: "token", message: "Enter the user's access token:" },
  ];
  inquirer
    .prompt(questions)
    .then((answers) => {
      /* delete */
      console.log(answers);
      if (answers.confirmed === "yes") {
        console.log("okie dokie, here we go!");
        d.deleteUserData(answers.token);
      }
    })
    .catch((error) => {
      if (error.isTtyError) {
        // Prompt couldn't be rendered in the current environment
      } else {
        console.log("hmm, something is wrong with the CLI:\n", error);
      }
    });
}
