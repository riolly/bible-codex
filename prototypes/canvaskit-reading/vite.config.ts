import { defineConfig } from "vite";

// Throwaway prototype config. `--host` so the user can open it on a physical
// Android tablet over LAN (browser-wasm is the pessimistic perf case we want to feel).
export default defineConfig({
  server: { host: true },
  // canvaskit-wasm ships a large .wasm; let Vite serve it as an asset via ?url imports.
  assetsInclude: ["**/*.wasm"],
});
