# Repository Agent Defaults

Apply the `token-efficient-coding` skill automatically for routine implementation, debugging, code review, and focused repository questions. The user does not need to name the skill.

Use the custom `token_saver` agent only for substantial, clearly scoped work that can run independently and whose delegation benefit exceeds its context and coordination cost.

Apply the `explain-code-changes` skill after every code or configuration change so the user receives a concise code-level explanation and verification result.

Reserve custom agents for substantial work with genuinely independent subtasks. Do not delegate routine implementation or explanation merely because an agent is available.

Keep repository exploration narrow, avoid generated and dependency directories unless required, run targeted verification first, and keep final responses concise. Correctness and safety take priority when broader investigation is necessary.

## Change discipline

- Make the smallest scoped change that satisfies the request.
- Inspect the exact data and UI path before editing.
- Preserve unrelated behavior, calculations, and existing data.
- Avoid broad flags, filters, or refactors for narrow problems.
- Skip tests unless the user explicitly asks for them.
- Explain uncertainty before changing existing data or calculations.
