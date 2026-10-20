import { writeFile } from "node:fs/promises";
import type { Agent, AgentEvent } from "@earendil-works/pi-agent-core";

/** One normalized line of the execution trace. */
export interface TraceEvent {
  seq: number;
  ts: number;
  type:
    | "agent_start"
    | "agent_end"
    | "turn_start"
    | "turn_end"
    | "tool_execution_start"
    | "tool_execution_end";
  turnIndex: number;
  toolName?: string;
  args?: unknown;
  result?: unknown;
  isError?: boolean;
}

/**
 * Records an agent's lifecycle events into a structured trace. `start()` subscribes
 * to the agent; `events` and `toJsonl()` expose the result. Streaming `message_*`
 * deltas are deliberately skipped (too noisy); `thinking` is off in this project.
 */
export class TraceRecorder {
  private seq = 0;
  private turnIndex = 0;
  private readonly lines: TraceEvent[] = [];

  constructor(private readonly agent: Agent) {}

  start(): void {
    this.agent.subscribe((event: AgentEvent) => this.onEvent(event));
  }

  private onEvent(event: AgentEvent): void {
    if (event.type === "turn_start") this.turnIndex += 1;
    const line = this.toTraceEvent(event);
    if (line) this.lines.push(line);
  }

  private toTraceEvent(event: AgentEvent): TraceEvent | undefined {
    switch (event.type) {
      case "agent_start":
      case "agent_end":
      case "turn_start":
      case "turn_end":
        return { seq: this.seq++, ts: Date.now(), type: event.type, turnIndex: this.turnIndex };
      case "tool_execution_start":
        return {
          seq: this.seq++,
          ts: Date.now(),
          type: event.type,
          turnIndex: this.turnIndex,
          toolName: event.toolName,
          args: event.args,
        };
      case "tool_execution_end":
        return {
          seq: this.seq++,
          ts: Date.now(),
          type: event.type,
          turnIndex: this.turnIndex,
          toolName: event.toolName,
          result: event.result,
          isError: event.isError,
        };
      default:
        return undefined; // message_start/update/end, tool_execution_update
    }
  }

  get events(): readonly TraceEvent[] {
    return this.lines;
  }

  toJsonl(): string {
    return this.lines.map((l) => JSON.stringify(l)).join("\n");
  }

  async writeToFile(path: string): Promise<void> {
    const data = this.toJsonl();
    await writeFile(path, data ? `${data}\n` : "", "utf8");
  }
}
