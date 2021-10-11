#!/usr/bin/env node

import yargs from "yargs";
import boxen from "boxen";
import commands from "./commands/index.js";

const args = yargs(process.argv.slice(2)).argv;

(async () => {
  const commandName = args._[0];
  const command = commands.find(c => c.name === commandName);
  if (!command) {
    console.error(`"${commandName}" is not a valid command.`);
    return;
  }

  const inputs = args._.slice(1);

  // removing "$0" and "_" keys from args object to produce the options object
  const { $0, _, ...options } = args;

  const result = await command.execute({ inputs, options });
  const borderColor = result.isSuccess() ? "green" : "red";
  const output = boxen(result.message, { padding: 1, borderColor });
  console.log(output);
})();
