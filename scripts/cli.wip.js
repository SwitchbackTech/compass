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
      message: `Are you sure you want to delete all of your user data? 
      \n** Reminder: Make sure you're using the correct user token **\n[type: "yes"]`,
    },
  ];
  inquirer
    .prompt(questions)
    .then((answers) => {
      /* delete */
      if (answers.confirmed === "yes") {
        console.log("okie dokie, here we go!");
        // d.deleteAllUserData();
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
