import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { createFakeModelRuntime } from "../src/model.ts";
import { createAgent } from "../src/agent.ts";
import { TraceRecorder } from "../src/trace.ts";

test("trace records tool calls and lifecycle events in order", async () => {
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo hi" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime);
  const trace = new TraceRecorder(agent);
  trace.start();

  await agent.prompt("run echo");
  await agent.waitForIdle();

  const events = trace.events;
  assert.ok(events.length > 0, "a run must produce at least one trace event");

  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i].seq > events[i - 1].seq, "seq must be strictly increasing");
    assert.ok(events[i].ts >= events[i - 1].ts, "ts must be non-decreasing");
  }

  const starts = events.filter((e) => e.type === "tool_execution_start");
  const ends = events.filter((e) => e.type === "tool_execution_end");
  assert.equal(starts.length, 1);
  assert.equal(ends.length, 1);
  assert.equal(starts[0].toolName, "bash");
  assert.equal((starts[0].args as { command?: string }).command, "echo hi");
  assert.equal(ends[0].isError, false);

  assert.ok(events.some((e) => e.type === "agent_start"));
  assert.ok(events.some((e) => e.type === "agent_end"));
  assert.ok(events.some((e) => e.type === "turn_start"));
});

test("toJsonl emits one valid line per event", async () => {
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo hi" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime);
  const trace = new TraceRecorder(agent);
  trace.start();

  await agent.prompt("run echo");
  await agent.waitForIdle();

  const lines = trace.toJsonl().split("\n").filter(Boolean);
  assert.equal(lines.length, trace.events.length);
  for (const line of lines) {
    const parsed = JSON.parse(line);
    assert.equal(typeof parsed.seq, "number");
    assert.equal(typeof parsed.ts, "number");
    assert.equal(typeof parsed.type, "string");
    assert.equal(typeof parsed.turnIndex, "number");
  }
});
