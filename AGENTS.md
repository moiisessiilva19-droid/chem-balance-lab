# AGENTS.md

## Project mission
This repository contains a chemistry learning app called **ChemBalance Lab**.
The app focuses on:
- chemical equilibrium
- reaction quotient Q
- equilibrium constants Kc and Kp
- Le Chatelier qualitative analysis
- student-friendly step-by-step development
- professor/technical mode
- QA test cases

## Working rules for Codex
1. Prioritize **chemical correctness** over visual polish.
2. Do not translate code keywords or technical tokens.
3. Do not break the current working single-file version unless replacing it with a clearly better and verified structure.
4. Keep support for decimal inputs such as `0.8`, `0.6`, `0.25`, `1.75`.
5. Do not mix species from previous exercises when a new exercise is loaded.
6. Build Q and K directly from the reaction stoichiometry:
   - products in numerator
   - reactants in denominator
   - exponents from stoichiometric coefficients
7. In `Auto` mode:
   - include `(g)` and `(aq)` in K
   - exclude `(s)` and `(l)` from K
8. Keep Q/K analysis separate from Le Chatelier perturbation analysis.
   - Q vs K tells the spontaneous shift from current composition.
   - Le Chatelier tells the qualitative shift caused by a perturbation.
9. When a mode does not use a value, display “No aplica” instead of misleading labels.
10. After modifying the motor, re-check all test cases in `TEST_CASES.md`.

## Current architecture
The current app is stored in `src/index.tsx` as a single-file React app to avoid CodeSandbox import path issues.
You may later refactor it into multiple files, but only if:
- the app still runs correctly
- imports resolve correctly
- the behavior remains verified against test cases

## Done criteria
A change is done only if:
- the app runs
- decimal input works
- test cases still pass
- the reaction expression and K/Q expressions are correct
- no stale species remain after loading a new exercise
