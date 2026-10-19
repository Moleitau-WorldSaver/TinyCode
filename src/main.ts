import { loadEnvFile } from "node:process";
import { createAgent } from "./agent.ts";
import { createDeepSeekModelRuntime, createFakeModelRuntime } from "./model.ts";
import { runTui } from "./tui.ts";

// Load ./.env so DEEPSEEK_API_KEY can live in a file instead of the shell.
try {
  loadEnvFile();
} catch {
  // No .env file — the key may still be provided via the environment.
}

/**
 * Interactive entry point. `--faux` runs the scripted fake model (no API key,
 * useful for eyeballing the TUI); otherwise DeepSeek (key from `.env` or env).
 */
async function main() {
  const useFaux = process.argv.includes("--faux");
  if (!useFaux && !process.env.DEEPSEEK_API_KEY) {
    console.error(
      "DEEPSEEK_API_KEY is not set. Add it to the .env file:\n" +
        "  DEEPSEEK_API_KEY=sk-...\n" +
        "Or export it in your shell, or run the fake model: npm run dev:faux",
    );
    process.exit(1);
  }
  const runtime = useFaux ? createFakeModelRuntime([]) : createDeepSeekModelRuntime();
  const agent = createAgent(runtime);
  await runTui(agent);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
