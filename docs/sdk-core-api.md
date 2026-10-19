# TinyCode SDK 事实（core / ai / tui @ 0.84.2）

本项目构建在 `pi-agent-core` + `pi-ai` + `pi-tui` 上，重做 `pi-coding-agent` 业务层。本文档是从 node_modules 源码 + 源码调查提炼的 API 事实；写适配器/接线前先读它。**确切签名以 `node_modules/@earendil-works/*/dist/**/*.d.ts` 为准。**

## 分层与版本

```
pi-ai            provider / transport / content 层（Model、Models、providers、流式）
  ↑
pi-agent-core    agent loop / harness / tools / session 层（依赖 pi-ai）
  ↑
pi-coding-agent  业务层（依赖 core+ai+tui+pi-client+pi-protocol）← 被重做，不使用
pi-tui           sibling，通用终端渲染库（被 coding-agent 消费）
```

- 锁 **0.84.2**（本仓库 skill 事实基座）。npm `latest` 已是 1.3.0，装 `latest` 会让本文档失效。
- 砍掉 `pi-client` / `pi-protocol` → 单进程终端程序。

## pi-agent-core 提供

- **`Agent`**（`dist/agent.d.ts`）：状态化 loop。`new Agent({ streamFn, initialState: { systemPrompt, model, tools, messages } })`；方法 `subscribe(listener)`、`prompt(text|messages)`、`continue()`、`abort()`、`steer()`、`followUp()`、`waitForIdle()`、`reset()`、`state`。
- **`AgentEvent`**（`dist/types.d.ts`）：`agent_start/agent_end`、`turn_start/turn_end`、`message_start/message_update/message_end`、`tool_execution_start/update/end`。`message_update` 带 `assistantMessageEvent`（text/thinking/toolcall 增量）。
- **`AgentTool`**（4 参 `execute(toolCallId, params, signal, onUpdate)`）vs **`AgentHarnessTool`**（5 参，多一个 `{ env }` context）——见"接线事实"。
- **`NodeExecutionEnv`**（从 `@earendil-works/pi-agent-core/node` 导入，**不在主 index**）：`new NodeExecutionEnv({ cwd })`，实现 `ExecutionEnv`（fs + shell）。
- **工具工厂**（`harness/tools/`）：`createBashTool()`、`createReadTool()`、`createEditTool()`、`createWriteTool()`。**没有 grep/find/ls**（需自研）。
- 其他：`AgentHarness`（持久化 harness，session/compaction/resume/lanes）、session store（`Session` / `JsonlSessionRepo`）、compaction 助手、`Result` / `ok` / `err` / `TaggedError`。

### 钩子：两套，别混

- **低层 `Agent` 的 loop 钩子**（TinyCode 用的这套，经 `AgentOptions` 注入，共 10 个）：`convertToLlm`（有默认实现，`AgentMessage[]`→LLM `Message[]`）、`transformContext`（调模型前改上下文）、`getApiKey`（每次调用动态解析 key）、`onPayload` / `onResponse`（流式请求/响应，成本与 header 在这）、`beforeToolCall` / `afterToolCall`（工具执行前后；`afterToolCall` 可覆盖 `content`/`isError`/`usage`/`terminate`，是工具结果 provenance 的缝）、`shouldStopAfterTurn`（每轮结束后返回 `true` 即优雅停机，护栏放这）、`prepareNextTurn` / `prepareNextTurnWithContext`（`turn_end` 后返回替换的 context/model/thinking）。
- **`AgentHarness.hooks` 的 11 个命名钩子**（TinyCode **不用**，属被重做的那层）：`before_run`/`before_resume`/`before_run_end`/`transform_context`/`before_request`/`before_payload`/`after_response`/`before_tool`/`after_tool`/`before_compaction`/`before_navigation`，经 `harness.on(name, handler)` 注册。

## pi-ai 提供

- `Model` / `Models` / `createModels()` / `createProvider()`（`dist/models.d.ts`）。`models.setProvider(provider)`、`models.getModel(provider, id)`、`models.streamSimple(model, context, options)`。
- `models.streamSimple` 正好满足 `Agent` 要的 `StreamFn` 形状（`(model, context, options?) => AssistantMessageEventStream`）。
- **`fauxProvider()`**（`dist/providers/faux.js`）：脚本化确定性模型。`faux.setResponses([fauxAssistantMessage([fauxToolCall(name, args)]), ...])` 排脚本，每次 `stream` 从队列 `shift` 一条；播空报 `"No more faux responses queued"`。仿真真实流式事件（text/thinking/toolcall delta）、响应 `AbortSignal`、估算 usage。辅助：`fauxText` / `fauxThinking` / `fauxToolCall` / `fauxAssistantMessage`。
- content 类型：`TextContent` / `ImageContent` / `ThinkingContent` / `ToolCall` / `Message` / `Context`。
- `Type` / `Static` / `TSchema`（typebox re-export，从主 index 导入）。
- provider 工厂（`dist/providers/`）：`anthropicProvider()` / `openaiProvider()` / `googleProvider()` / `amazonBedrockProvider()`。

## pi-tui（通用渲染库，无聊天语义）

- 组件：`Markdown`（需完整 `MarkdownTheme`）、`Text`、`Input`（`onSubmit`/`onEscape`/`setValue`）、`Editor`、`Container` / `VStack` / `HStack`、`ScrollView` 等。
- 运行时：`ProcessTerminal` + `TuiAltScreen`（fullscreen viewport，`setLayoutRoot`）/ `TuiMainScreen`（regular scrollback）。
- `TUI` 方法：`addChild` / `setFocus` / `setLayoutRoot` / `start` / `stop` / `requestRender` / `addInputListener`。
- **没有** assistant-message / tool-card / thinking 聊天组件——那些是 `pi-coding-agent` 自己的 `modes/interactive/components`，需自建。

## 关键接线事实（易错点）

1. `NodeExecutionEnv` 从 `@earendil-works/pi-agent-core/node` 导入，主 index 无。
2. SDK 工具工厂返回 5 参 `AgentHarnessTool`（`execute(..., { env })`）；裸 `Agent` 要 4 参 `AgentTool`。桥接见 `src/tools.ts`（展开 + 覆盖 `execute` 注入 `{ env }`）。
3. `pi-tui` 不提供聊天组件；输出契约 = 自己把流式增量 / 工具生命周期 / 思考建模成组件树。
4. deepseek 等非 Anthropic 路径 `agent_end` 可能不带 usage 字段 → `usage_reported` token 数为 undefined，成本追踪需第二来源（provider headers / 日志）。

## 业务层职责：parity vs differentiation

**parity**（跑起来必须重实现）：模型胶水、工具集（复用 4 个 + 补 grep/find/ls）、系统提示词、终端聊天 UI。
**differentiation**（比 pi 强，也是标杆）：评测体系、工具结果 provenance、usage 准确性、预算/终止策略、记忆层。
