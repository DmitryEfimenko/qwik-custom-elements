---
name: 'Continue Generator Plan'
description: 'Pick the next unfinished task from the Stencil-to-Qwik generator plan and execute it while keeping plan and findings up to date'
argument-hint: 'Optional extra constraints or focus for the next task'
agent: 'Plan'
model: 'Auto'
---

Continue implementation of the Stencil-to-Qwik generator by following the handoff docs in [plan.md](../../qwik-app/scripts/generate-qwik-from-stenciljs/plan.md) and [research.md](../../qwik-app/scripts/generate-qwik-from-stenciljs/research.md).

Task selection rules:

1. Read [plan.md](../../qwik-app/scripts/generate-qwik-from-stenciljs/plan.md) first.
2. Read [research.md](../../qwik-app/scripts/generate-qwik-from-stenciljs/research.md) second.
3. Select the first item in `Execution Order` whose `State` is not `done`.
4. Treat that item as the only in-scope implementation task for this run unless the plan explicitly says it depends on an earlier unfinished item.
5. If the user supplied extra instructions, apply them only if they do not conflict with the plan or research.

Execution requirements:

1. Before editing, restate which plan item was selected and why it is the next executable item.
2. Perform the implementation work for that item in the workspace.
3. Reuse existing project patterns and keep changes minimal and focused.
4. If the selected item reveals a contradiction or missing prerequisite in the plan or research, update the docs before continuing.
5. When you complete the item, update [plan.md](../../qwik-app/scripts/generate-qwik-from-stenciljs/plan.md):
   - set that item's `State` appropriately
   - add any durable lessons or pitfalls to the `Findings` section
6. If the item cannot be completed, leave its state not done and document the blocker in `Findings`.

Validation requirements:

1. Satisfy the selected item's acceptance criteria.
2. Run the verification steps listed for that item when feasible in the current environment.
3. If a verification step cannot be run, say exactly why in the final response and record any important limitation in `Findings`.

Response requirements:

1. State which plan item was selected.
2. Summarize the code and document changes made.
3. Report verification performed and any remaining blockers or follow-ups.

Additional user request for this run:

{{$input}}
