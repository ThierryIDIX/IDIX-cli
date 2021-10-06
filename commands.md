# Available commands

## Initialize Git flow from a Redmine ticket

## Description

Create a working branch (and its associated MR) from a Redmine ticket ID.

## Signature

```bash
$ idix ticket:init

# or
$ idix ticket
```

### Process

- [x] Check user config
- [x] Ask user for the Redmine ticket ID
- [x] Load Redmine ticket
- [x] Determine Gitlab project path (`git remote -v get-url origin`)
- [x] Ask user to confirm the Gitlab project
- [x] Determine the base branch (`git branch --remotes --list 'origin/release-*' --sort='-creatordate'`)
- [x] Ask user to confirm the base branch
- [x] Generate the working branch name from the ticket title
- [x] Create the working branch
- [x] Generate the merge request title from the ticket title
- [x] Create the merge request
- [x] Display useful info in the terminal
