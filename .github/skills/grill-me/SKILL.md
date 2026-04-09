---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

Before asking questions, check for system-level planning artifacts under `docs/SYSTEM/` and load them when present:

- `docs/SYSTEM/prd.md`
- `docs/SYSTEM/api-contracts.md`
- `docs/SYSTEM/decisions.md`
- `docs/SYSTEM/findings-log.md`

Use these as prior constraints so you avoid re-asking already settled decisions.

When proposing recommendations, prefer consistency with existing system decisions unless the user explicitly wants to revisit them.

IMPORTANT: Use askQuestions tool to ask questions.