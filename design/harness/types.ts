/**
 * The contract between the harness and a feature dir. A feature dir is one
 * design question: `design/<slug>/variants.ts` default-exports a DesignFeature.
 * Variants must be STRUCTURALLY different (layout / hierarchy / affordance),
 * not recolors — see the /design skill.
 */

import type { DrawFonts } from '@app/draw/fonts-core';

/** One rendered PNG. `width`/`height` are CSS display px (pre-supersampling). */
export interface RenderedPng {
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
}

/** One state a variant must show (e.g. "light · base", "dark · large"). */
export interface DesignState {
  readonly label: string;
  readonly image: RenderedPng;
}

export interface RenderCtx {
  /** Production Cardo fonts + the engine's measure seam (drawFontsFromTypeface). */
  readonly fonts: DrawFonts;
}

export interface DesignVariant {
  /** Switcher key, conventionally 'A' | 'B' | 'C'. */
  readonly key: string;
  /** Short human name shown in the pill, e.g. "Hanging versal". */
  readonly name: string;
  render(ctx: RenderCtx): DesignState[] | Promise<DesignState[]>;
}

export interface DesignFeature {
  /** The one-line design question this dir answers. */
  readonly question: string;
  /** GitHub issue number the gate serves (linked in the header). */
  readonly issue?: number;
  readonly variants: readonly DesignVariant[];
}
