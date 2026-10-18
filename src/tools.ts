import {
  createBashTool,
  createEditTool,
  createReadTool,
  createWriteTool,
} from "@earendil-works/pi-agent-core";
import type {
  AgentTool,
  ExecutionEnv,
} from "@earendil-works/pi-agent-core";

/**
 * Bridge the SDK's harness tools (5-arg execute with an `{ env }` context) into
 * plain `AgentTool`s (4-arg execute) for the low-level `Agent`. We inject the
 * shared `NodeExecutionEnv` as the tool context.
 */
function withEnv(tool: any, env: ExecutionEnv): AgentTool<any> {
  return {
    ...tool,
    execute: (
      toolCallId: string,
      params: unknown,
      signal?: AbortSignal,
      onUpdate?: unknown,
    ) => tool.execute(toolCallId, params, signal, onUpdate, { env }),
  } as AgentTool<any>;
}

export function createTools(env: ExecutionEnv): AgentTool<any>[] {
  return [
    withEnv(createBashTool(), env),
    withEnv(createReadTool(), env),
    withEnv(createEditTool(), env),
    withEnv(createWriteTool(), env),
  ];
}
