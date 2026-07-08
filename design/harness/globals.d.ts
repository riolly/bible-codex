// The full CanvasKit build has no bundled .d.ts at its subpath — reuse the
// package-root types (same API surface).
declare module 'canvaskit-wasm/bin/full/canvaskit' {
  const init: typeof import('canvaskit-wasm').default;
  export default init;
}

declare module '*.wasm?url' {
  const url: string;
  export default url;
}

declare module '*.ttf?url' {
  const url: string;
  export default url;
}
