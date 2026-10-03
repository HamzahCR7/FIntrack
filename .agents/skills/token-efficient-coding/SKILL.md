---
name: token-efficient-coding
description: Complete routine, well-scoped coding, debugging, review, and repository questions while minimizing context reads, tool output, and response length. Apply automatically to ordinary focused development work, even when the user does not mention token savings. Do not use for broad architecture, unfamiliar cross-system changes, or high-risk work requiring extensive investigation.
---

# Token-Efficient Coding

Optimize for the smallest reliable context, not merely the shortest answer.

1. Restate the concrete target internally and stay within it. Ask a question only when the missing answer would materially change the implementation.
2. Inspect named files first. Search for exact symbols and imports before reading adjacent files. Do not scan the whole repository unless focused searches fail.
3. Read bounded excerpts instead of large generated files, lockfiles, build artifacts, dependency folders, or complete logs.
4. Make the smallest coherent change that satisfies the request. Preserve unrelated code and avoid optional refactors.
5. Run the narrowest meaningful verification first. Expand testing only when the change or a failure justifies it.
6. Keep tool output bounded. Filter commands and cap displayed results; summarize noisy failures instead of replaying them repeatedly.
7. When delegation is available, invoke the `token_saver` custom agent automatically for independent focused work only when its coordination cost is justified. Handle trivial questions and one-line edits directly.
8. Return a concise handoff: outcome, changed files, verification, and any genuine caveat. Omit a step-by-step diary unless requested.

If evidence indicates the task is broader or riskier than described, prioritize correctness and tell the user why additional inspection is necessary.
