# AGENTS.md

This repository is currently empty or not yet scaffolded. Treat this as a greenfield project unless files appear later. Keep instructions minimal, explicit, and aligned with the project as it is created.

## Working conventions

- Prefer the smallest change that solves the task.
- Before editing, inspect the existing files and project structure; do not assume a framework or language without checking.
- Preserve the conventions of the project once it exists (framework structure, naming, linting, testing, and package manager choices).
- If the repository is empty, prefer creating a minimal, working baseline before adding extra tooling or abstractions.
- Keep documentation references lightweight and link to existing docs instead of duplicating them.

## Project initialization guidance

- When creating the app, choose the simplest solid setup for the requested product or stack.
- Prefer standard project conventions for the chosen language or framework.
- If a build/test command exists, use it before claiming work is complete.
- If no automated checks exist yet, verify behavior with the lightest available command and explicit manual validation.

## Before making changes

1. Check whether the repository already contains a project scaffold, package manifest, or app source.
2. Identify the framework/tooling in use before creating files or adding dependencies.
3. Keep feature work focused and avoid unrelated refactors.

## After making changes

- Confirm the result with the relevant validation command.
- Keep commit-sized changes easy to review.
- Update docs only when the project structure or workflows materially change.

## Helpful default rules for AI agents

- Do not add new dependencies unless they are clearly required.
- Favor well-known project conventions over custom patterns.
- When unsure about architecture, ask for clarification rather than inventing a large structure.
- Treat this workspace as a starting point for a proper product implementation, not a finished codebase.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
