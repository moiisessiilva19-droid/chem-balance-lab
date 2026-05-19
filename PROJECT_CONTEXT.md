# PROJECT_CONTEXT.md

## Project name
ChemBalance Lab

## Purpose
An educational React app for:
- equilibrium chemistry
- Le Chatelier principle
- Kc / Kp reasoning
- Q vs K prediction
- step-by-step guided explanations

## Current status
The app already includes:
- chemistry/lab visual styling
- tabs for calculator, results, development, Le Chatelier, exercises, QA, credits
- creators section
- a single-file React implementation in `src/index.tsx`

## Creators
- Moisés Silva
- Felipe Barriga
- Pablo Herrera
- Hugo Morales
- Álvaro Correa
- Fabián Rojas

## Important constraints
- The chemistry motor is inspired by an Excel model the user has been replicating.
- The user wants the app to look chemical and academic, not generic.
- The app must support decimal inputs.
- The app must allow loading exercises without contaminating the next exercise with old species.
- The user wants:
  - student mode
  - professor mode
  - exercises
  - QA
  - credits

## Known issues to keep validating
1. K/Q construction must always match the balanced reaction.
2. The app must distinguish:
   - Q/K analysis
   - Le Chatelier perturbation analysis
3. Kp and Kc conversions may need further verification in advanced cases.
4. Xi/bounds solving should be treated as not fully certified for every imaginable exercise until more testing is done.
5. The current app is useful, but not yet proven against all edge cases.

## Immediate priorities
1. Preserve working behavior.
2. Improve chemical correctness.
3. Add more test coverage.
4. Then refactor or improve UI if needed.
