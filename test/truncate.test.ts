import { test } from "node:test";
import assert from "node:assert/strict";
import type { AfterToolCallContext } from "@earendil-works/pi-agent-core";
import { createTruncation, DEFAULT_MAX_RESULT_CHARS } from "../src/truncate.ts";

function ctx(text: string): AfterToolCallContext {
  return {
    result: { content: [{ type: "text", text }], details: undefined },
  } as unknown as AfterToolCallContext;
}

test("oversized result is truncated to a head plus a marker", async () => {
  const truncate = createTruncation();
  const big = "x".repeat(DEFAULT_MAX_RESULT_CHARS + 100);

  const out = await truncate(ctx(big));

  assert.ok(out, "expected an override for an oversized result");
  const text = (out!.content as { text: string }[])[0].text;
  assert.ok(text.length < DEFAULT_MAX_RESULT_CHARS, "truncated text must be under the threshold");
  assert.match(text, /truncated \d+ chars/);
});

test("small result is left unchanged", async () => {
  const truncate = createTruncation();

  const out = await truncate(ctx("short output"));

  assert.equal(out, undefined);
});
