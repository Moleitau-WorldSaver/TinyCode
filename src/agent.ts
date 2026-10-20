import { Agent } from "@earendil-works/pi-agent-core";
import { NodeExecutionEnv } from "@earendil-works/pi-agent-core/node";
import { createTools } from "./tools.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";
import { createGuard, type Confirm } from "./guard.ts";
import { createTruncation } from "./truncate.ts";
import type { AgentModelRuntime } from "./model.ts";

export interface CreateAgentOptions {
  /** Working directory for tool execution. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Graceful stop after this many turns (session total). 0 disables the cap. */
  maxTurns?: number;
  /** Default bash timeout in seconds when the model omits one. Prevents hangs. */
  bashTimeoutSeconds?: number;
  /** Ask the user Y/N for ambiguous-but-dangerous tool calls. Defaults to deny. */
  confirm?: Confirm;
}

/** Build a ready-to-prompt Agent wired to the runtime, four tools, and a turn cap. */
export function createAgent(
  runtime: AgentModelRuntime,
  options: CreateAgentOptions = {},
): Agent {
  const cwd = options.cwd ?? process.cwd();
  const maxTurns = options.maxTurns ?? 30;
  const bashTimeoutSeconds = options.bashTimeoutSeconds ?? 60;
  const env = new NodeExecutionEnv({ cwd });
  const tools = createTools(env, { bashTimeoutSeconds });
  // Deny by default: without an injected confirm, dangerous calls are blocked.
  const confirm = options.confirm ?? (() => Promise.resolve(false));

  let turnCount = 0;
  return new Agent({
    streamFn: runtime.streamFn,
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model: runtime.model,
      tools,
      messages: [],
      thinkingLevel: "off",
    },
    beforeToolCall: createGuard(confirm),
    afterToolCall: createTruncation(),
    shouldStopAfterTurn: maxTurns > 0 ? () => ++turnCount >= maxTurns : undefined,
  });
}
