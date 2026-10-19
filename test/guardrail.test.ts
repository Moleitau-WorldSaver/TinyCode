import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import { createFakeModelRuntime } from "../src/model.ts";
import { createAgent } from "../src/agent.ts";

test("maxTurns cap stops the loop after N turns", async () => {
  // 50 tool-call turns would keep the loop going forever without the cap.
  const responses = Array.from({ length: 50 }, () =>
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo x" })]),
  );
  const runtime = createFakeModelRuntime(responses);
  const agent = createAgent(runtime, { maxTurns: 3 });

  await agent.prompt("keep going");
  await agent.waitForIdle();

  // Three turns were consumed, the rest were never requested.
  assert.equal(runtime.getPendingResponseCount(), 47);
});

test("maxTurns: 0 disables the cap", async () => {
  const responses = [
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo x" })]),
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo y" })]),
    fauxAssistantMessage("done"),
  ];
  const runtime = createFakeModelRuntime(responses);
  const agent = createAgent(runtime, { maxTurns: 0 });

  await agent.prompt("keep going");
  await agent.waitForIdle();

  // With the cap disabled, all three turns run to a natural stop.
  assert.equal(runtime.getPendingResponseCount(), 0);
});
