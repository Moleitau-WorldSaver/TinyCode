import { test } from "node:test";
import assert from "node:assert/strict";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import type { Terminal } from "@earendil-works/pi-tui";
import { createFakeModelRuntime } from "../src/model.ts";
import { createAgent } from "../src/agent.ts";
import { mountChatTui } from "../src/tui.ts";

/** In-memory terminal: the injection seam that lets the TUI run headless. */
class FakeTerminal implements Terminal {
  out = "";
  columns = 80;
  rows = 24;
  get kittyProtocolActive() {
    return false;
  }
  start(): void {}
  stop(): void {}
  async drainInput(): Promise<void> {}
  write(data: string): void {
    this.out += data;
  }
  moveBy(): void {}
  hideCursor(): void {}
  showCursor(): void {}
  clearLine(): void {}
  clearFromCursor(): void {}
  clearScreen(): void {}
  setTitle(): void {}
  setProgress(): void {}
}

test("TUI renders a scripted tool call and final text", async () => {
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([fauxToolCall("bash", { command: "echo hi-from-tui" })]),
    fauxAssistantMessage("Built and ran."),
  ]);
  const agent = createAgent(runtime, { maxTurns: 10 });
  const terminal = new FakeTerminal();
  const { tui } = mountChatTui(agent, terminal);

  tui.start();
  await agent.prompt("echo hi");
  await agent.waitForIdle();
  tui.renderNow(true);

  assert.match(terminal.out, /bash/);
  assert.match(terminal.out, /Built and ran/);
});

test("TUI renders a stream error instead of showing nothing", async () => {
  const runtime = createFakeModelRuntime([
    fauxAssistantMessage([], {
      errorMessage: "DeepSeek API key not configured",
      stopReason: "error",
    }),
  ]);
  const agent = createAgent(runtime, { maxTurns: 10 });
  const terminal = new FakeTerminal();
  const { tui } = mountChatTui(agent, terminal);

  tui.start();
  await agent.prompt("build me a game");
  await agent.waitForIdle();
  tui.renderNow(true);

  assert.match(terminal.out, /DeepSeek API key not configured/);
});
