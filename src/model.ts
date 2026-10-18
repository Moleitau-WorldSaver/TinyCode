import { createModels, fauxProvider } from "@earendil-works/pi-ai";
import type { FauxProviderHandle, Model } from "@earendil-works/pi-ai";
import type { StreamFn } from "@earendil-works/pi-agent-core";

export interface AgentModelRuntime {
  model: Model<any>;
  streamFn: StreamFn;
  setResponses: FauxProviderHandle["setResponses"];
  getPendingResponseCount: FauxProviderHandle["getPendingResponseCount"];
}

/**
 * Deterministic scripted model runtime backed by pi-ai's `fauxProvider`.
 * Used to exercise the agent loop, tools, events, and cancellation without a
 * real provider, spend, or model variance.
 */
export function createFakeModelRuntime(
  initialResponses: Parameters<FauxProviderHandle["setResponses"]>[0] = [],
): AgentModelRuntime {
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
