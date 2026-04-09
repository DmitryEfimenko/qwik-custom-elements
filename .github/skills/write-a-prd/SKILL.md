---
name: write-a-prd
description: Create a PRD through user interview, codebase exploration, and module design, then submit as a GitHub issue. Use when user wants to write a PRD, create a product requirements document, or plan a new feature.
---

This skill will be invoked when the user wants to create a PRD. You may skip steps if you don't consider them necessary.

1. Classify the request as one of these modes:

- Feature mode: End-user behavior, UX outcomes, and product workflows.
- Architecture mode: Internal platform capabilities, APIs, contracts, reliability, and cross-team integration.

If it is unclear, ask follow-up questions until one mode is primary. If both are important, use mixed mode and cover both explicitly.

2. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.

3. Explore the repo to verify their assertions and understand the current state of the codebase.

4. Interview the user relentlessly about every aspect of this plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. Use [grill-me](../grill-me/SKILL.md) skill to do this.

For architecture mode and mixed mode, explicitly cover contract ownership, compatibility constraints, rollout sequencing, failure handling, and operational expectations.

5. Sketch out the major modules you will need to build or modify to complete the implementation. Actively look for opportunities to extract deep modules that can be tested in isolation.

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

Check with the user that these modules match their expectations. Check with the user which modules they want tests written for.

6. Once you have a complete understanding of the problem and solution, use the template below to write the PRD. The PRD should be submitted as a GitHub issue.

Use this GitHub issue title convention unless the user specifies otherwise: PRD: [short title].

The submitted GitHub PRD issue becomes the canonical source of feature intent for downstream slicing and execution.

For architecture mode and mixed mode, include a migration strategy, deprecation approach when applicable, and cross-team communication expectations.

<prd-template>

## Problem Statement

Describe the core problem from the perspective of whoever experiences it most.

- Feature mode: End-user pain and business impact.
- Architecture mode: Team pain, integration friction, operational risk, and scalability constraints.
- Mixed mode: Cover both sets of impact clearly.

## Solution

Describe the proposed solution at the right level of abstraction for the mode.

- Feature mode: User-facing behavior, workflows, and expected outcomes.
- Architecture mode: Target architecture, module boundaries, interfaces, compatibility approach, and rollout phases.
- Mixed mode: Separate user-facing and platform-facing outcomes.

## User and Consumer Stories

A LONG, numbered list of stories. Include actors relevant to the mode. Each story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list should be extremely extensive and cover all aspects of the feature.

For architecture mode and mixed mode, include internal actors like consuming teams, platform maintainers, SRE, and QA.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

For architecture mode and mixed mode, also include:

- Versioning strategy and backward compatibility policy
- Authn and authz boundaries where relevant
- Caching strategy and invalidation expectations
- Reliability goals and failure-mode behavior
- Observability expectations (metrics, logs, traces)
- Migration and deprecation plan

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

For architecture mode and mixed mode, also include contract tests, cross-team integration tests, and resilience tests for degraded dependencies.

## Out of Scope

A description of the things that are out of scope for this PRD.

Be explicit about boundaries to prevent scope creep across teams.

## Further Notes

Any further notes about the feature.

For architecture mode and mixed mode, include dependency map, communication plan, and rollout checkpoints.

</prd-template>
