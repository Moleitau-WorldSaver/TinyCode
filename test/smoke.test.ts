import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import type { AgentEvent } from "@earendil-works/pi-agent-core";
import { createFakeModelRuntime } from "../src/model.ts";
import { createAgent } from "../src/agent.ts";

type ToolStart = Extract<AgentEvent, { type: "tool_execution_start" }>;
type ToolEnd = Extract<AgentEvent, { type: "tool_execution_end" }>;

test("scripted fake model executes bash and terminates cleanly", async () => {
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo hello-from-fake" })]),
    fauxAssistantMessage("Done."),
  ]);
  const agent = createAgent(runtime);

  const events: AgentEvent[] = [];
  agent.subscribe((event) => events.push(event));

  await agent.prompt("Run `echo hello-from-fake` via bash.");
  await agent.waitForIdle();

  const starts = events.filter((e) => e.type === "tool_execution_start") as ToolStart[];
  const ends = events.filter((e) => e.type === "tool_execution_end") as ToolEnd[];

  assert.equal(starts.length, 1);
  assert.equal(starts[0].toolName, "bash");
  assert.equal(ends.length, 1);
  assert.equal(ends[0].isError, false);

  // The bash tool actually executed and returned real output.
  const result = ends[0].result as { content?: { text?: string }[] };
  const text = (result?.content ?? []).map((b) => b.text ?? "").join("");
  assert.match(text, /hello-from-fake/);

  // Terminated with the final event, and the script was fully consumed.
  assert.ok(events.some((e) => e.type === "agent_end"));
  assert.equal(runtime.getPendingResponseCount(), 0);
});
