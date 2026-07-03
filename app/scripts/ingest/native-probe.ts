import { spawnSync } from 'node:child_process';

/**
 * Probe whether a native-backed module is usable — in a throwaway subprocess.
 *
 * A try/catch around import() only handles the clean failure (unbuilt binding
 * → ERR_DLOPEN_FAILED). An ABI-mismatched binding — built under a different
 * Node major, as tree-sitter's non-NAPI binding is prone to — segfaults the
 * process on load, which no in-process guard can contain and which kills the
 * vitest worker fork ("Worker exited unexpectedly"). The child process takes
 * the crash instead; anything but a clean exit 0 (throw, signal) means skip.
 *
 * `script` must call process.exit(0) on success and exit non-zero on failure.
 */
export function nativeModuleLoads(script: string): boolean {
  return (
    spawnSync(process.execPath, ['-e', script], {
      cwd: __dirname, // resolve modules against app/node_modules
      stdio: 'ignore',
      timeout: 30_000,
    }).status === 0
  );
}
