import prompts from "prompts";
import { Command, CommandResult, store } from "../core/index.js";

const questions = [
  {
    type: "text",
    name: "redmine_api_key",
    message: "Your Redmine API Key (see https://redmine.idix.fr/my/account)",
    validate(input) {
      return !!input;
    }
  },
  {
    type: "text",
    name: "gitlab_api_token",
    message:
      "Your Gitlab API Token (see https://gitlab.idix.fr/-/profile/personal_access_tokens)",
    validate(input) {
      return !!input;
    }
  }
];

const command = new Command(
  "configure",
  "Configure IDIX CLI with user credentials & preferences."
);

command.execute = async () => {
  const answers = (await prompts(questions)) || {};
  const { redmine_api_key, gitlab_api_token } = Object.assign(
    {},
    store.all,
    answers
  );
  if (redmine_api_key) {
    store.set("redmine_api_key", redmine_api_key);
  }
  if (gitlab_api_token) {
    store.set("gitlab_api_token", gitlab_api_token);
  }

  return new CommandResult(
    "success",
    "Configuration :",
    JSON.stringify(store.all, null, 2)
  );
};

export default command;
