import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import type { AgentEvent } from "@earendil-works/pi-agent-core";
import { createFakeModelRuntime } from "../src/model.ts";
import { createAgent } from "../src/agent.ts";

test("bash tool kills a non-exiting command via the default timeout", async () => {
  // `node -e "setInterval(...)"` never exits; without a timeout the loop hangs.
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([
      fauxToolCall("bash", { command: 'node -e "setInterval(()=>{},1000)"' }),
    ]),
    fauxAssistantMessage("recovered after the timeout"),
  ]);
  const agent = createAgent(runtime, { bashTimeoutSeconds: 0.3 });

  const events: AgentEvent[] = [];
  agent.subscribe((e) => events.push(e));

  const start = Date.now();
  await agent.prompt("run a command that hangs");
  await Promise.race([
    agent.waitForIdle(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("agent hung on bash")), 5000),
    ),
  ]);
  const elapsed = Date.now() - start;

  // Killed in ~300ms, not left hanging, and the loop recovered.
  assert.ok(elapsed < 3000, `expected a ~300ms timeout kill, got ${elapsed}ms`);

  const ends = events.filter((e) => e.type === "tool_execution_end");
  assert.equal(ends.length, 1);
  assert.equal((ends[0] as { isError: boolean }).isError, true);
});
