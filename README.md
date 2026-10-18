# TinyCode

A terminal coding agent that reimplements the pi SDK's business layer (`pi-coding-agent`) on top of `pi-agent-core` + `pi-ai` + `pi-tui`, pinned to **0.84.2**.

Vocabulary lives in [GLOSSARY.md](GLOSSARY.md); the architecture decision is [docs/adr/0001-build-on-core-ai-tui.md](docs/adr/0001-build-on-core-ai-tui.md).

## Current state — milestone #1 (in progress)

**Working (verified on this machine):** the headless agent loop.

- `Agent` (from `pi-agent-core`) driven by a scripted `fauxProvider` model.
- The four SDK tools (`bash`/`read`/`edit`/`write`) bridged into `AgentTool`s over a shared `NodeExecutionEnv`.
- Event streaming, tool execution, and clean termination all verified end-to-end (`bash` really ran and returned output).

## Run

```bash
npm install         # pinned 0.84.2 dependencies
npm run dev         # headless smoke test (scripted fake model calls bash)
npm run typecheck   # tsc --noEmit
```

## Remaining — milestone #1

1. **Terminal UI on `pi-tui`** — the main from-scratch piece (input + streaming transcript + tool cards). Not yet live-verified: needs a real TTY.
2. **`grep` / `find` / `ls`** — `pi-agent-core` ships only bash/read/edit/write.
3. **DeepSeek provider** — OpenAI-compatible endpoint behind the same model seam; key from `DEEPSEEK_API_KEY`.
4. **End-to-end run** — make a failing test pass, with a recorded transcript as evidence.

## Key integration facts (learned from SDK source)

- `NodeExecutionEnv` is exported from `@earendil-works/pi-agent-core/node`, **not** the main index.
- The SDK's tool factories (`createBashTool`, …) return 5-arg `AgentHarnessTool`s (execute takes an `{ env }` context); the low-level `Agent` wants 4-arg `AgentTool`s — `src/tools.ts` bridges them.
- `fauxProvider` (from `pi-ai`) is a scripted/deterministic model for testing the loop; see `src/model.ts`.
