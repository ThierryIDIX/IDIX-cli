#!/usr/bin/env node

import yargs from "yargs";
import chalk from "chalk";
import commands from "./commands/index.js";

const args = yargs(process.argv.slice(2)).argv;

(async () => {
  const commandName = args._[0];
  const command = commands.find(c => c.name === commandName);
  if (!command) {
    console.error(`"${commandName}" is not a valid command.`);
    return;
  }

  const result = await command.execute();
  const line = "-".repeat(process.stdout.columns);
  const headerBg = result.isSuccess() ? "bgGreen" : "bgRed";
  const headeColor = result.isSuccess() ? "black" : "white";
  const lineColor = result.isSuccess() ? "green" : "red";
  const headerText = result.isSuccess() ? " Success " : " Error ";
  console.log(chalk[lineColor](line));
  console.log(chalk.bold[headeColor][headerBg](headerText));
  for (const message of result.messages) {
    console.log(message);
  }
  console.log(chalk[lineColor](line));
})();
