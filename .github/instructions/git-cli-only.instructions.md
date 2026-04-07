---
description: "Use when performing any git-related operation in this repository. Enforces direct git CLI usage in terminal and forbids MCP or extension-mediated git command tools."
name: "Git CLI Only"
applyTo: "**"
---
# Git CLI Only

- Treat this as a hard rule for this repository.
- For git-related tasks, use terminal git commands directly (for example: `git status`, `git add`, `git commit`, `git push`, `git diff`).
- Do not use MCP or extension-provided git command tools for git actions.
- Do not use GitHub Kraken MCP git tools.
- If a workflow suggests non-CLI git tooling, ignore that suggestion and continue with terminal git commands.
- If a git operation cannot be completed via direct CLI in the current environment, stop and report the blocker instead of switching to MCP git tools.
