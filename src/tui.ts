import {
  Input,
  ProcessTerminal,
  ScrollView,
  Text,
  TuiAltScreen,
  VStack,
  type Terminal,
} from "@earendil-works/pi-tui";
import type { Agent, AgentEvent } from "@earendil-works/pi-agent-core";
import type { Confirm, ConfirmSlot } from "./guard.ts";

/**
 * Minimal interactive chat TUI: scrolling transcript on top, pinned input at the
 * bottom. Maps `AgentEvent` onto a component tree; streamed text uses a per-message
 * buffer because `Text` has no append. Tool calls render as a single status line.
 */
export function mountChatTui(agent: Agent, terminal: Terminal, confirmSlot?: ConfirmSlot) {
  const tui = new TuiAltScreen(terminal);

  const transcript = new VStack();
  const scroll = new ScrollView(transcript, { primary: true, follow: "end" });
  const input = new Input();

  tui.setLayoutRoot(
    new VStack([
      { component: scroll, grow: 1, shrink: 1 },
      { component: input, grow: 0 },
    ]),
  );

  let buffer = "";
  let currentText: Text | null = null;
  const toolCards = new Map<string, Text>();

  agent.subscribe((event: AgentEvent) => {
    switch (event.type) {
      case "turn_start":
        buffer = "";
        currentText = null;
        break;
      case "message_update": {
        // The loop forwards raw provider stream events: text deltas arrive as
        // `text_delta` (with a `delta` chunk), not a normalized `type:"text"`.
        const e = event.assistantMessageEvent as any;
        if (e && e.type === "text_delta" && typeof e.delta === "string") {
          if (!currentText) {
            currentText = new Text();
            transcript.addChild(currentText);
          }
          buffer += e.delta;
          currentText.setText(buffer);
          tui.requestRender();
        }
        break;
      }
      case "tool_execution_start": {
        const card = new Text(`⏳ ${event.toolName} ${JSON.stringify(event.args)}`);
        transcript.addChild(card);
        toolCards.set(event.toolCallId, card);
        tui.requestRender();
        break;
      }
      case "tool_execution_end": {
        const card = toolCards.get(event.toolCallId);
        if (card) {
          card.setText(`${event.isError ? "✗" : "✓"} ${event.toolName}`);
          tui.requestRender();
        }
        break;
      }
      case "message_end": {
        // A stream that fails (auth, network) ends here with an errorMessage on
        // the message. Without this, the TUI shows nothing and the failure is
        // invisible.
        const msg = event.message as { errorMessage?: string };
        if (msg && typeof msg.errorMessage === "string" && msg.errorMessage) {
          transcript.addChild(new Text(`✗ ${msg.errorMessage}`));
          tui.requestRender();
        }
        break;
      }
      default:
        break;
    }
  });

  // Confirm mode: when the guard asks a Y/N question, the input temporarily reads
  // the answer instead of a chat message. "y"/"yes" allows; anything else denies.
  let pendingConfirm: ((ok: boolean) => void) | null = null;
  if (confirmSlot) {
    const askConfirm: Confirm = (message) => {
      transcript.addChild(new Text(`❓ ${message} [y/N]`));
      tui.requestRender();
      return new Promise<boolean>((resolve) => {
        pendingConfirm = resolve;
      });
    };
    confirmSlot.setHandler(askConfirm);
  }

  input.onSubmit = (value) => {
    input.setValue("");
    if (pendingConfirm) {
      const answer = value.trim().toLowerCase();
      const resolve = pendingConfirm;
      pendingConfirm = null;
      resolve(answer === "y" || answer === "yes");
      return;
    }
    void agent.prompt(value);
  };
  input.onEscape = () => agent.abort();

  tui.setFocus(input);
  return { tui, input };
}

/** Run the interactive TUI on the real process terminal. Blocks until the process exits. */
export async function runTui(agent: Agent, confirmSlot?: ConfirmSlot): Promise<void> {
  const { tui } = mountChatTui(agent, new ProcessTerminal(), confirmSlot);
  tui.start();
  // The TUI drives itself from stdin; keep the process alive until interrupted.
  await new Promise<void>(() => {});
}
