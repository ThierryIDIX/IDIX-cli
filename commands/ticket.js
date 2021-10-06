import prompts from "prompts";
import axios from "axios";
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

command.execute = async () => {
  const { redmine_api_key, gitlab_api_token } = store.all;

  // check user configuration
  if (!redmine_api_key || !gitlab_api_token) {
    return new CommandResult(
      "error",
      "User configuration is missing. Please run `idix configure`."
    );
  }

  // ask ticket id + load the ticket
  const { ticket_id } = await prompts({
    type: "number",
    name: "ticket_id",
    message: "Redmine ticket ID"
  });

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
  const { base_branch } = await prompts({
    type: "text",
    name: "base_branch",
    message: "Git base branch",
    initial: guessedBranch
  });

  // create working branch
  const { subject: title, id, tracker } = ticket.issue;
  const branchType = trackersMap[tracker.name];
  const branchPrefix = branchType ? `${branchType}/` : "";
  const workingBranchName = branchPrefix + slugify(`${id}-${title}`);
  const branchCreated = await createWorkingBranch(
    base_branch,
    workingBranchName
  );
  if (!branchCreated) {
    return new CommandResult(
      "error",
      `Cannot create working branch "${workingBranchName}" from "${base_branch}".`
    );
  }

  const mergeRequestTitle = `Draft: #${id} ${title}`;
  const mergeRequest = await createMergeReques(
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
    JSON.stringify(
      {
        "Working branch": workingBranchName,
        "Merge request": mergeRequest.web_url
      },
      null,
      2
    )
  );
};

export default command;

async function loadTicket(id, apiKey) {
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
  let branch = "master";
  try {
    const options =
      "branch --remotes --list origin*release-* --sort=-creatordate";
    const { stdout } = await spawn("git", options.split(" "), {
      encoding: "utf8"
    });
    branch = stdout.trim().split("origin/")[1].replace(/\n/g, "").trim();
  } catch (error) {
    console.error("determineBaseBranch", error);
  }
  return branch;
}

async function createWorkingBranch(baseBranch, name) {
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
  }
}

async function createMergeReques(
  apiKey,
  projectPath,
  sourceBranch,
  targetBranch,
  title
) {
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
    console.error("createMergeReques", error);
    return null;
  }
}
