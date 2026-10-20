import type {
  BeforeToolCallContext,
  BeforeToolCallResult,
} from "@earendil-works/pi-agent-core";
import { BLACKLIST, DANGEROUS, escapesCwd } from "./guard-rules.ts";

/**
 * Ask the user a yes/no question. Resolve `true` to allow the tool call, `false`
 * to block it. Decouples the guard from any UI: the TUI passes a real prompt, a
 * test passes a scripted stub.
 */
export type Confirm = (message: string) => Promise<boolean>;

/**
 * Build a `beforeToolCall` hook that gates destructive operations in three layers:
 *   1. blacklist → hard block (the model is never consulted)
 *   2. dangerous → escalate to the injected `confirm`
 *   3. Y/N       → allow (undefined) or block ({ block: true, reason })
 *
 * `bash` is inspected by its command string; `write`/`edit` by their path (they
 * accept absolute paths that escape the workspace); everything else passes through.
 */
export function createGuard(confirm: Confirm) {
  return async function guard(
    ctx: BeforeToolCallContext,
    _signal?: AbortSignal,
  ): Promise<BeforeToolCallResult | undefined> {
    const name = ctx.toolCall.name;

    if (name === "bash") {
      const cmd = String((ctx.args as { command?: unknown } | undefined)?.command ?? "");
      const banned = BLACKLIST.find((r) => r.test(cmd));
      if (banned) return { block: true, reason: `blocked: ${banned.reason}` };

      const danger = DANGEROUS.find((r) => r.test(cmd));
      if (danger) {
        const allowed = await confirm(`Allow this command? ${cmd} (${danger.reason})`);
        return allowed ? undefined : { block: true, reason: "denied by user" };
      }
      return undefined;
    }

    if (name === "write" || name === "edit") {
      const path = String((ctx.args as { path?: unknown } | undefined)?.path ?? "");
      if (escapesCwd(path)) {
        const allowed = await confirm(`Allow writing outside the workspace? ${path}`);
        return allowed ? undefined : { block: true, reason: "denied by user" };
      }
      return undefined;
    }

    return undefined;
  };
}

/** A confirm sink the TUI fills in after mounting. Denies until a handler is set. */
export interface ConfirmSlot {
  setHandler(handler: Confirm): void;
  confirm: Confirm;
}

export function createConfirmSlot(): ConfirmSlot {
  let handler: Confirm | null = null;
  return {
    setHandler(h: Confirm) {
      handler = h;
    },
    confirm(message: string) {
      return handler ? handler(message) : Promise.resolve(false);
    },
  };
}
