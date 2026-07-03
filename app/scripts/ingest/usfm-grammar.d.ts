/**
 * usfm-grammar 3.x ships no TypeScript declarations. Only the slice the
 * ingest uses is typed here; the USJ output shape is typed on our side
 * (normalize.ts UsjDoc).
 */
declare module 'usfm-grammar' {
  export class USFMParser {
    constructor(usfm?: string | null, usj?: object | null, usx?: object | null);
    /** Strict-mode parse errors collected by the tree-sitter grammar. */
    errors: string[];
    toUSJ(
      excludeMarkers?: string[] | null,
      includeMarkers?: string[] | null,
      ignoreErrors?: boolean,
      combineTexts?: boolean,
    ): object;
  }
}
