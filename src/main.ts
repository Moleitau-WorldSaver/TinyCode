import { Agent } from "@earendil-works/pi-agent-core";
import { NodeExecutionEnv } from "@earendil-works/pi-agent-core/node";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { createTools } from "./tools.ts";
import { createFakeModelRuntime } from "./model.ts";
import { SYSTEM_PROMPT } from "./prompt.ts";

/**
 * Headless smoke test: script the fake model to call `bash`, verify the agent
 * loop emits tool start/end events and terminates cleanly. This proves the
 * wiring (streamFn, tools, env, events) before the TUI is added.
 */
async function main() {
  const env = new NodeExecutionEnv({ cwd: process.cwd() });
  const tools = createTools(env);

  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo hello-from-fake" })]),
    fauxAssistantMessage("Tool ran. Done."),
  ]);

  const agent = new Agent({
    streamFn: runtime.streamFn,
    initialState: {
      systemPrompt: SYSTEM_PROMPT,
      model: runtime.model,
      tools,
      messages: [],
    },
  });

  agent.subscribe((event) => {
    switch (event.type) {
      case "message_update": {
        const e = event.assistantMessageEvent as any;
        if (e && typeof e.delta === "string") {
          console.log(`  [${e.type}] ${e.delta}`);
        }
        break;
      }
      case "tool_execution_start":
        console.log(`[tool_start] ${event.toolName} ${JSON.stringify(event.args)}`);
        break;
      case "tool_execution_end": {
        const r = event.result as any;
        const text =
          r?.content?.map((b: any) => b.text ?? "").join("") ?? JSON.stringify(r);
        console.log(`[tool_end] ${event.toolName} isError=${event.isError} ${String(text).slice(0, 200)}`);
        break;
      }
      case "agent_end":
        console.log("[agent_end]");
        break;
      default:
        console.log(`[${event.type}]`);
    }
  });

  await agent.prompt("Run the command `echo hello-from-fake` using the bash tool.");
  await agent.waitForIdle();

  console.log(`remaining faux responses: ${runtime.getPendingResponseCount()}`);
  console.log("DONE");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
