本项目构建在 pi-agent-core + pi-ai + pi-tui @ 0.84.2 上，不使用 createAgentSession/defineTool；pi-coding-agent skill 的参考层讲的是被重做的那层。

集成要点见 README.md；SDK 事实见 docs/sdk-core-api.md。

确切签名以 node_modules/@earendil-works/*/dist/**/*.d.ts 为准。

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `Moleitau-WorldSaver/TinyCode`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.