import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import type { AgentEvent } from "@earendil-works/pi-agent-core";
import { createFakeModelRuntime } from "../src/model.ts";
import { createAgent } from "../src/agent.ts";
import type { Confirm } from "../src/guard.ts";
import { createConfirmSlot } from "../src/guard.ts";

type ToolEnd = Extract<AgentEvent, { type: "tool_execution_end" }>;

/** A confirm stub that records every message and returns scripted answers. */
function makeConfirm(answers: boolean[]) {
  const calls: string[] = [];
  const confirm: Confirm = async (msg) => {
    calls.push(msg);
    return answers.shift() ?? false;
  };
  return { confirm, calls };
}

test("blacklist hard-blocks a destructive command without consulting the user", async () => {
  const { confirm, calls } = makeConfirm([true]);
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "sudo whoami" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime, { confirm });

  const events: AgentEvent[] = [];
  agent.subscribe((e) => events.push(e));

  await agent.prompt("run sudo");
  await agent.waitForIdle();

  const ends = events.filter((e) => e.type === "tool_execution_end") as ToolEnd[];
  assert.equal(ends.length, 1);
  assert.equal(ends[0].isError, true);
  assert.equal(calls.length, 0, "blacklist must block without asking the user");
});

test("dangerous command escalates to the user and a denial blocks it", async () => {
  const { confirm, calls } = makeConfirm([false]);
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "rm notes.txt" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime, { confirm });

  const events: AgentEvent[] = [];
  agent.subscribe((e) => events.push(e));

  await agent.prompt("delete notes");
  await agent.waitForIdle();

  const ends = events.filter((e) => e.type === "tool_execution_end") as ToolEnd[];
  assert.equal(ends[0].isError, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /rm notes\.txt/);
});

test("dangerous command runs when the user says yes", async () => {
  const { confirm } = makeConfirm([true]);
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "rm --help" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime, { confirm });

  const events: AgentEvent[] = [];
  agent.subscribe((e) => events.push(e));

  await agent.prompt("write a marker");
  await agent.waitForIdle();

  const ends = events.filter((e) => e.type === "tool_execution_end") as ToolEnd[];
  assert.equal(ends[0].isError, false, "an allowed command should run, not be blocked");
});

test("write outside the workspace triggers the user and a denial blocks it", async () => {
  const { confirm, calls } = makeConfirm([false]);
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("write", { path: "/etc/evil.txt", content: "x" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime, { confirm });

  const events: AgentEvent[] = [];
  agent.subscribe((e) => events.push(e));

  await agent.prompt("write outside workspace");
  await agent.waitForIdle();

  const ends = events.filter((e) => e.type === "tool_execution_end") as ToolEnd[];
  assert.equal(ends[0].isError, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/etc\/evil\.txt/);
});

test("read passes through without consulting the user", async () => {
  const { confirm, calls } = makeConfirm([]);
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("read", { path: "README.md" })]),
    fauxAssistantMessage("done"),
  ]);
  const agent = createAgent(runtime, { confirm });

  const events: AgentEvent[] = [];
  agent.subscribe((e) => events.push(e));

  await agent.prompt("read the readme");
  await agent.waitForIdle();

  const ends = events.filter((e) => e.type === "tool_execution_end") as ToolEnd[];
  assert.equal(ends[0].isError, false);
  assert.equal(calls.length, 0, "read must not trigger the confirm");
});

test("confirm slot denies until a handler is set, then forwards", async () => {
  const slot = createConfirmSlot();
  assert.equal(await slot.confirm("q"), false, "must deny before a handler is set");

  slot.setHandler(async () => true);
  assert.equal(await slot.confirm("q"), true);

  slot.setHandler(async () => false);
  assert.equal(await slot.confirm("q"), false);
});
