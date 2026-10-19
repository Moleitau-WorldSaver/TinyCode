# TinyCode

A terminal coding agent that reimplements the pi SDK's business layer (`pi-coding-agent`) on top of `pi-agent-core` + `pi-ai` + `pi-tui`, pinned to **0.84.2**.

Vocabulary lives in [GLOSSARY.md](GLOSSARY.md); the architecture decision is [docs/adr/0001-build-on-core-ai-tui.md](docs/adr/0001-build-on-core-ai-tui.md).

## Current state — milestone #2 (in progress)

**Verified headless (this machine):** the loop, the turn cap, and the TUI rendering.

- `Agent` driven by either a scripted `fauxProvider` (`--faux`) or DeepSeek (`deepseek-v4-flash`, key from `DEEPSEEK_API_KEY`).
- The four SDK tools (`bash`/`read`/`edit`/`write`) bridged into `AgentTool`s over a shared `NodeExecutionEnv`.
- A minimal `pi-tui` chat interface (input + streaming transcript + tool cards), headless-tested via an in-memory `Terminal`.
- A `shouldStopAfterTurn` max-turns guardrail (default 30).

**Not yet live-verified:** a real-TTY interactive run against DeepSeek — that needs `DEEPSEEK_API_KEY` and a terminal.

## Run

```bash
npm install         # pinned 0.84.2 dependencies
npm run dev         # interactive TUI on DeepSeek (needs DEEPSEEK_API_KEY)
npm run dev:faux    # interactive TUI on the scripted fake model (no key)
npm test            # headless tests (loop, guardrail, TUI, bash timeout, snake)
npm run typecheck   # tsc --noEmit
```

## Snake

A dependency-free terminal snake game (`snake.mjs`), alongside the agent loop.

```bash
npm run snake          # play in a terminal (arrows/WASD, p pause, r restart, q quit)
npm run snake:smoke    # headless check: wall death, eating/growth, reverse-guard
```

The game state is exported (`createGame`, `tick`, `turn`, `render`, `frame`) and
covered by `test/snake.test.ts`. Importing the module has no side effects.

## Remaining

1. **Live end-to-end** — run `npm run dev` in a real terminal, ask for a game, and watch DeepSeek drive the loop to a runnable program. The demo's acceptance bar is **runnable**, not correct (see GLOSSARY).
2. **`grep` / `find` / `ls`** — deferred: `bash` covers them; structured search + provenance is a later differentiation step.
3. **eval substrate** — deferred: the first task (with a verifier) is where "runnable" becomes "correct".

## Key integration facts (learned from SDK source)

- `NodeExecutionEnv` is exported from `@earendil-works/pi-agent-core/node`, **not** the main index.
- The SDK's tool factories (`createBashTool`, …) return 5-arg `AgentHarnessTool`s (execute takes an `{ env }` context); the low-level `Agent` wants 4-arg `AgentTool`s — `src/tools.ts` bridges them.
- `fauxProvider` (from `pi-ai`) is a scripted/deterministic model for testing the loop; see `src/model.ts`.
