# Repository Agent Defaults

Apply the `token-efficient-coding` skill automatically for routine implementation, debugging, code review, and focused repository questions. The user does not need to name the skill.

For a clearly scoped coding task that can be completed independently, automatically use the custom `token_saver` agent when delegation is available and its coordination cost is justified. Do not spawn it for trivial questions or one-line edits, because a subagent would consume more tokens than direct work.

After every code or configuration change, give the user a visible explanation for each changed file: what changed, why it was necessary, how it affects behavior or maintenance, and what verification was performed. Explain important logic and connected data flow rather than merely paraphrasing the diff. This requirement applies even when the change is small and even when the custom `explainable_coder` agent is unavailable.

Use the custom `explainable_coder` agent for non-trivial implementation tasks when delegation is available and its coordination cost is justified. It may coordinate existing agents, but the primary agent remains responsible for inspecting the final diff and presenting the required explanation to the user.

Keep repository exploration narrow, avoid generated and dependency directories unless required, run targeted verification first, and keep final responses concise. Correctness and safety take priority when broader investigation is necessary.
