# TinyCode

TinyCode is a terminal coding agent built by reimplementing the pi SDK's business layer (`pi-coding-agent`) on top of `pi-agent-core`, `pi-ai`, and `pi-tui`. It exists so its author can study and improve a coding agent incrementally, with an evaluation system as the measuring stick.

## Pi SDK layers

**business layer** (业务层):
The pi SDK's top-level orchestration layer, published as `@earendil-works/pi-coding-agent`. It owns the chat UI components, session manager, extension system, and client/server wiring. TinyCode reimplements it.
_Avoid_: calling it "pi" — that conflates this one layer with the whole SDK.

**pi-agent-core**:
The SDK layer that provides the agent loop, harness, four tools (bash/read/edit/write), compaction helpers, and the session store.

**pi-ai**:
The SDK layer that provides LLM providers, content types, and streaming.

**pi-tui**:
The SDK's generic terminal-rendering library — components (Markdown, Text, Box, Input, Editor) and a TUI runtime. It has no chat or agent semantics.

## Benchmarking

**Parity**:
What TinyCode must reimplement merely to run: model/auth glue, the tool set, a system prompt, and the terminal UI.

**Differentiation**:
What TinyCode does that stock pi does poorly or not at all — the eval system, tool-result provenance, usage accuracy, budget enforcement, and (later) memory. This is the benchmark.

**eval substrate** (评测基座):
A frozen set of coding tasks, each with a starting state, an instruction, and an automated pass/fail check, scoring success plus cost and time.

**verifier** (判分器):
The automated check that decides whether a task's outcome is correct (e.g. a test suite passing).

## Memory

**dreaming**:
A memory-consolidation technique the author wants to A/B-test against the eval substrate later. Definition pending.
