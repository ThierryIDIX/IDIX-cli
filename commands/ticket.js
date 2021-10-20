import prompts from "prompts";
import chalk from "chalk";
import axios from "axios";
import { Spinner } from "cli-spinner";
import { spawn } from "promisify-child-process";
import { Command, CommandResult, store } from "../core/index.js";
import { slugify } from "../utils.js";

const trackersMap = {
  Evolution: "feature",
  Anomalie: "fix"
};

const command = new Command(
  "ticket",
  "Create working branch and the corresponding merge request from a Redmine ticket."
);

const spinner = new Spinner();
spinner.setSpinnerString(18);

command.execute = async ({ inputs, options }) => {
  const { redmine_api_key, gitlab_api_token } = store.all;

  let [ticket_id] = inputs;

  // check user configuration
  if (!redmine_api_key || !gitlab_api_token) {
    return new CommandResult(
      "error",
      "User configuration is missing. Please run `idix configure`."
    );
  }

  if (!ticket_id) {
    // ask ticket id + load the ticket
    let answers = await prompts({
      type: "number",
      name: "ticket_id",
      message: "Redmine ticket ID"
    });
    ticket_id = answers.ticket_id;
  }

  const ticket = await loadTicket(ticket_id, redmine_api_key);
  if (!ticket) {
    return new CommandResult("error", `Redmine ticket ${ticket_id} not found.`);
  }

  // determine Gitlab path
  const guessedGitlabPath = await determineGitlabPath();
  const { gitlab_path } = await prompts({
    type: "text",
    name: "gitlab_path",
    message: "Gitlab project path",
    initial: guessedGitlabPath || ""
  });

  // determine base branch
  const guessedBranch = await determineBaseBranch();
  const branchChoices = [
    {
      title: "master",
      value: "master"
    }
  ];
  if (guessedBranch) {
    branchChoices.unshift({
      title: guessedBranch,
      value: guessedBranch
    });
  }
  const { base_branch } = await prompts({
    type: "select",
    name: "base_branch",
    message: "Git base branch",
    choices: branchChoices,
    initial: 0
  });

  const { subject: title, id, tracker } = ticket.issue;
  const branchType = trackersMap[tracker.name];
  const branchPrefix = branchType ? `${branchType}/` : "";
  const workingBranchName = branchPrefix + slugify(`${id}-${title}`);

  const { working_branch } = await prompts({
    type: "text",
    name: "working_branch",
    message: "Branch name ?",
    initial: workingBranchName
  });

  const branchCreated = await createWorkingBranch(base_branch, working_branch);
  if (!branchCreated) {
    return new CommandResult(
      "error",
      `Cannot create working branch "${working_branch}" from "${base_branch}".`
    );
  }

  const mergeRequestTitle = `Draft: #${id} ${title}`;
  const mergeRequest = await createMergeRequest(
    gitlab_api_token,
    gitlab_path,
    workingBranchName,
    base_branch,
    mergeRequestTitle
  );
  if (!mergeRequest) {
    return new CommandResult(
      "error",
      `Cannot create merge request from "${workingBranchName}" to "${base_branch}".`
    );
  }

  return new CommandResult(
    "success",
    `${chalk.bold("New branch:")} ${working_branch}\n${chalk.bold(
      "Merge Request:"
    )} ${mergeRequest.web_url}`
  );
};

export default command;

async function loadTicket(id, apiKey) {
  spinner.setSpinnerTitle("Loading ticket infos...");
  spinner.start();
  try {
    return (
      await axios.get(`https://redmine.idix.fr/issues/${id}.json`, {
        headers: {
          "X-Redmine-API-Key": apiKey
        }
      })
    ).data;
  } catch (error) {
    console.error("loadTicket", error);
    return null;
  } finally {
    spinner.stop();
    process.stdout.write("\n");
  }
}

async function determineGitlabPath() {
  let path = "";
  const { stdout } = await spawn("git", "remote -v get-url origin".split(" "), {
    encoding: "utf8"
  });
  if (stdout) {
    const start = stdout.indexOf(":") + 1;
    const end = stdout.indexOf(".git");
    path = stdout.slice(start, end);
  }
  return path;
}

async function determineBaseBranch() {
  let branch = null;
  try {
    const options =
      "branch --remotes --list origin*release-* --sort=-creatordate";
    let { stdout } = await spawn("git", options.split(" "), {
      encoding: "utf8"
    });
    stdout = stdout.trim();
    if (stdout) {
      branch = stdout.split("origin/")[1].replace(/\n/g, "").trim();
    }
  } catch (error) {
    console.error("determineBaseBranch", error);
  }
  return branch;
}

async function createWorkingBranch(baseBranch, name) {
  spinner.setSpinnerTitle("Creating new branch...");
  spinner.start();

  const options = {
    encoding: "utf8"
  };
  try {
    await spawn("git", `checkout ${baseBranch}`.split(" "), options);
    await spawn("git", `checkout -b ${name}`.split(" "), options);
    await spawn(
      "git",
      `push --set-upstream origin ${name}`.split(" "),
      options
    );
    return true;
  } catch (error) {
    console.error("createWorkingBranch", error);
    return false;
  } finally {
    spinner.stop();
    process.stdout.write("\n");
  }
}

async function createMergeRequest(
  apiKey,
  projectPath,
  sourceBranch,
  targetBranch,
  title
) {
  spinner.setSpinnerTitle("Creating merge request...");
  spinner.start();
  const path = encodeURIComponent(projectPath);
  try {
    return (
      await axios.post(
        `https://gitlab.idix.fr/api/v4/projects/${path}/merge_requests`,
        {
          id: path,
          source_branch: sourceBranch,
          target_branch: targetBranch,
          title
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        }
      )
    ).data;
  } catch (error) {
    console.error("createMergeRequest", error);
    return null;
  } finally {
    spinner.stop();
    process.stdout.write("\n");
  }
}
