# Repository Agent Defaults

Apply the `token-efficient-coding` skill automatically for routine implementation, debugging, code review, and focused repository questions. The user does not need to name the skill.

For a clearly scoped coding task that can be completed independently, automatically use the custom `token_saver` agent when delegation is available and its coordination cost is justified. Do not spawn it for trivial questions or one-line edits, because a subagent would consume more tokens than direct work.

Keep repository exploration narrow, avoid generated and dependency directories unless required, run targeted verification first, and keep final responses concise. Correctness and safety take priority when broader investigation is necessary.
