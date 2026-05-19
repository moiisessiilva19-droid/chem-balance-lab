# ChemBalance Lab — Codex-ready project

This folder is prepared to open directly in Codex as a local project.

## Included
- `src/index.tsx`: current single-file working app
- `package.json`
- `AGENTS.md`: project instructions for Codex
- `PROJECT_CONTEXT.md`: project overview and goals
- `TEST_CASES.md`: chemistry validation cases
- `.codex/config.toml`: simple project config scaffold

## Recommended first prompt in Codex
Read `AGENTS.md`, `PROJECT_CONTEXT.md`, and `TEST_CASES.md`.
Then inspect `src/index.tsx`.
Do not change the UI first.
First validate the chemistry motor:
- reaction parsing
- K and Q construction
- solids/liquids exclusion in Auto
- decimal input handling
- exercise reloading without stale species
After that, list bugs and propose a safe refactor plan.

## Notes
The current code lives in a single file because the user had repeated import-path issues in CodeSandbox.
Refactor only after keeping behavior stable.
