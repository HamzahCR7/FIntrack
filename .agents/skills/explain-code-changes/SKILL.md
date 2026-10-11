---
name: explain-code-changes
description: Explain completed repository code or configuration changes at code level. Apply after implementation work when reporting what was changed, why the exact code was used, how it executes, and what verification passed.
---

# Explain Code Changes

After changing code or configuration, give a concise explanation for every changed file.

- Show the important added or modified code when that makes the explanation clearer.
- Explain how relevant variables, data structures, expressions, conditions, and function calls work together.
- Explain why the code belongs at that location and how it addresses the observed problem.
- Trace connected data or control flow when the change crosses functions or layers.
- Include one concrete input or execution example when it materially clarifies behavior.
- State the verification performed and its result, including anything not verified.
- Label mechanical, generated, or formatting-only edits without over-explaining them.

Do not merely list features or paraphrase the diff. Keep the explanation proportional to the change and the user's technical level.
