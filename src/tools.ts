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
 * shared `NodeExecutionEnv` as the tool context, and can inject default tool
 * params (e.g. a bash timeout) that the model may omit.
 */
function withEnv(
  tool: any,
  env: ExecutionEnv,
  defaults?: Record<string, unknown>,
): AgentTool<any> {
  return {
    ...tool,
    execute: (
      toolCallId: string,
      params: unknown,
      signal?: AbortSignal,
      onUpdate?: unknown,
    ) => {
      const merged =
        defaults && params && typeof params === "object"
          ? { ...defaults, ...(params as Record<string, unknown>) }
          : params;
      return tool.execute(toolCallId, merged, signal, onUpdate, { env });
    },
  } as AgentTool<any>;
}

export interface CreateToolsOptions {
  /** Default bash timeout in seconds, applied when the model omits one. */
  bashTimeoutSeconds?: number;
}

export function createTools(
  env: ExecutionEnv,
  options: CreateToolsOptions = {},
): AgentTool<any>[] {
  return [
    withEnv(
      createBashTool(),
      env,
      options.bashTimeoutSeconds !== undefined
        ? { timeout: options.bashTimeoutSeconds }
        : undefined,
    ),
    withEnv(createReadTool(), env),
    withEnv(createEditTool(), env),
    withEnv(createWriteTool(), env),
  ];
}
