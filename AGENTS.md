# AGENTS.md

Operating notes for AI coding agents (Claude Code, Codex, Cursor, Copilot and others) working in this repository. Everything here is derived from the files actually in the tree, so trust it over guesses, and update it when the facts change.

## What this repository is

Web system designed for any modern device with a browser. CTRL apps can perform complex tasks more easily than native apps by simulating an abstract virtual system within the browser.

- Homepage: https://ctrl.best
- Source: https://github.com/nirholas/CTRL
- Primary language: HTML
- License: Other (see the LICENSE file)

## Repository layout

- `CTRL-Store/`
- `appdata/`
- `assets/`
- `docs/`
- `improvements/`
- `libs/`
- `screens/`
- `scripts/`
- `whatis/`
- `README.md`
- `LICENSE`
- `SECURITY.md`

## Setup

No package manifest is checked in. Follow the installation steps in `README.md`.

## Commands

No build, test or lint scripts are declared in the tree. Verify changes by running the project as `README.md` describes.

## Conventions

- Commit messages follow Conventional Commits (`type(scope): summary`), matching the existing history.
- Read the surrounding code before adding to it, and match its naming, file organisation and error-handling style.
- Keep `README.md` accurate: if a change alters behaviour, commands or configuration, update the docs in the same commit.
- Do not leave TODO comments, stub functions, placeholder data or commented-out code behind. Finish what you start or leave it out.
- Small, focused commits with a subject line that describes the change, not the act of committing.

## Where to raise things

- Bugs and feature requests: https://github.com/nirholas/CTRL/issues
- Questions and ideas: https://github.com/nirholas/CTRL/discussions
- Security issues: follow `SECURITY.md`, never a public issue.
