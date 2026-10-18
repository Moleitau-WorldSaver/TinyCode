# Build TinyCode on pi-agent-core + pi-ai + pi-tui, not on pi-coding-agent

TinyCode reimplements the pi SDK's business layer (`@earendil-works/pi-coding-agent`) from scratch on top of only `pi-agent-core`, `pi-ai`, and `pi-tui`, pinned to 0.84.2, and drops `pi-client`/`pi-protocol` (no client/server split — a single in-process terminal app). We chose this over using `pi-coding-agent` directly because its layer is exactly what we want to control (UI, memory, evaluation), and over building on raw provider SDKs because `pi-agent-core` already supplies the loop, tools, and session store.

## Considered options

- **Use `pi-coding-agent` directly**: rejected — its business layer (chat UI components, session manager, extension system, client/server) is precisely what TinyCode wants to replace and study.
- **Build on raw provider SDKs**: rejected — reimplementing the agent loop and session durability buys nothing over `pi-agent-core`.

## Consequences

- Version pinned to 0.84.2; npm `latest` (1.3.0) is a different line and would invalidate the SDK facts recorded in this repo.
- We reimplement: model/auth glue, the tool set (adding grep/find/ls), a system prompt, and the entire terminal chat UI (`pi-tui` provides only generic components, no chat semantics).
- We get for free: the agent loop, events, four tools, compaction helpers, session store, and typed errors.
