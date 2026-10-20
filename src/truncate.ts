import type {
  AfterToolCallContext,
  AfterToolCallResult,
} from "@earendil-works/pi-agent-core";

/** Truncate a tool result's text when it exceeds this many characters. */
export const DEFAULT_MAX_RESULT_CHARS = 8000;
/** Keep this many leading characters when truncating. */
export const TRUNCATED_HEAD_CHARS = 4000;

/**
 * Build an `afterToolCall` hook that replaces oversized tool results with a
 * truncated head plus a trailing marker. Returns `undefined` (no override) when
 * the result is small enough.
 */
export function createTruncation(options: { maxChars?: number } = {}) {
  const maxChars = options.maxChars ?? DEFAULT_MAX_RESULT_CHARS;

  return async function truncate(
    ctx: AfterToolCallContext,
    _signal?: AbortSignal,
  ): Promise<AfterToolCallResult | undefined> {
    const text = (ctx.result?.content ?? [])
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (text.length <= maxChars) return undefined;

    const head = text.slice(0, TRUNCATED_HEAD_CHARS);
    const truncated = `${head}\n…(truncated ${text.length - TRUNCATED_HEAD_CHARS} chars)`;
    return { content: [{ type: "text", text: truncated }] };
  };
}
