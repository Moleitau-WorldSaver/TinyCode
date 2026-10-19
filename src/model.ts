import { createModels, fauxProvider } from "@earendil-works/pi-ai";
import { deepseekProvider } from "@earendil-works/pi-ai/providers/deepseek";
import type { FauxProviderHandle, Model } from "@earendil-works/pi-ai";
import type { StreamFn } from "@earendil-works/pi-agent-core";

/** Common shape every model runtime exposes to `createAgent`. */
export interface AgentModelRuntime {
  model: Model<any>;
  streamFn: StreamFn;
}

/** The deterministic fake runtime adds scripted-response controls for tests. */
export interface FakeModelRuntime extends AgentModelRuntime {
  setResponses: FauxProviderHandle["setResponses"];
  getPendingResponseCount: FauxProviderHandle["getPendingResponseCount"];
}

/**
 * Deterministic scripted model runtime backed by pi-ai's `fauxProvider`.
 * Exercises the agent loop, tools, events, and the TUI without a real provider.
 */
export function createFakeModelRuntime(
  initialResponses: Parameters<FauxProviderHandle["setResponses"]>[0] = [],
): FakeModelRuntime {
  const models = createModels();
  const faux = fauxProvider();
  models.setProvider(faux.provider);
  const model = faux.getModel() as Model<any>;
  faux.setResponses(initialResponses);

  const streamFn: StreamFn = (m, ctx, opts) => models.streamSimple(m, ctx, opts);

  return {
    model,
    streamFn,
    setResponses: (responses) => faux.setResponses(responses),
    getPendingResponseCount: () => faux.getPendingResponseCount(),
  };
}

/**
 * DeepSeek through pi-ai's bundled `deepseekProvider` (OpenAI Chat Completions).
 * The catalog ships `deepseek-v4-flash` / `deepseek-v4-pro`; the key comes from
 * the `DEEPSEEK_API_KEY` environment variable.
 */
export function createDeepSeekModelRuntime(
  modelId: string = "deepseek-v4-flash",
): AgentModelRuntime {
  const models = createModels();
  models.setProvider(deepseekProvider());
  const model = models.getModel("deepseek", modelId) as Model<any> | undefined;
  if (!model) {
    throw new Error(`Unknown DeepSeek model "${modelId}"`);
  }

  const streamFn: StreamFn = (m, ctx, opts) => models.streamSimple(m, ctx, opts);
  return { model, streamFn };
}
