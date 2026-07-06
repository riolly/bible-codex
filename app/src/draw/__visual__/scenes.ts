/**
 * The visual state matrix — shared by the gallery (eyeball) and the goldens gate
 * (regression). One place to add a case so both stay in sync. Each case renders
 * a real production layout (passage × theme × fontSize × mode) to a PNG.
 */

import { layoutCodexPage, layoutScrollColumns, resolveRules } from '../../engine/layout';
import { ChapterBuilder, miniChapter } from '../../engine/layout/fixtures';
import type { DrawFonts } from '../fonts-core';
import { THEMES, type Theme } from '../style';
import { loadHeadlessFonts, renderPageToPng, renderScrollToPng } from './harness';

type Chapter = ReturnType<typeof miniChapter>;

/** Passages: a mixed narrative w/ drop-cap, a poetry psalm, a prose paragraph. */
const PASSAGES: Record<string, () => Chapter> = {
  creation: () => miniChapter(),
  psalm: () =>
    new ChapterBuilder(1)
      .block({ genre: 'heading', role: 'psalm_title', text: 'A Psalm of David .' })
      .block({ genre: 'poetry', indent: 1, verse: 1, text: 'Blessed is the man' })
      .block({
        genre: 'poetry',
        indent: 2,
        verse: 1,
        text: 'that walketh not in the counsel of the ungodly ,',
      })
      .block({
        genre: 'poetry',
        indent: 1,
        verse: 2,
        text: 'But his delight is in the law of the LORD ;',
      })
      .block({
        genre: 'poetry',
        indent: 2,
        verse: 2,
        text: 'and in his law doth he meditate day and night .',
      })
      .build(),
  prose: () =>
    new ChapterBuilder(1)
      .block({ genre: 'heading', role: 'section', text: 'The Word Made Flesh' })
      .block({
        genre: 'prose',
        verse: 1,
        text: 'In the beginning was the Word , and the Word was with God , and the Word was God .',
      })
      .block({ genre: 'prose', verse: 2, text: 'The same was in the beginning with God .' })
      .block({
        genre: 'prose',
        verse: 3,
        text: 'All things were made by him ; and without him was not any thing made that was made .',
      })
      .build(),
};

const THEME_NAMES: readonly Theme[] = ['light', 'dark'];
const FONT_SIZES: readonly { readonly label: string; readonly px: number }[] = [
  { label: 'base', px: 18 },
  { label: 'large', px: 26 },
];

export interface VisualCase {
  readonly id: string;
  readonly label: string;
  render(fonts: DrawFonts): Buffer;
}

/**
 * The full matrix: every passage × theme × fontSize as a Codex page, plus one
 * Scroll-mode case (landscape) to guard the second reading surface.
 */
export function visualCases(): VisualCase[] {
  const cases: VisualCase[] = [];

  for (const [passage, build] of Object.entries(PASSAGES)) {
    for (const theme of THEME_NAMES) {
      for (const size of FONT_SIZES) {
        cases.push({
          id: `codex_${passage}_${theme}_${size.label}`,
          label: `${passage} · ${theme} · ${size.label}`,
          render: (fonts) => {
            const rules = resolveRules({ fontSize: size.px });
            const page = layoutCodexPage({ ...build(), rules, metrics: fonts.metrics });
            return renderPageToPng(page, rules, fonts, THEMES[theme], 2);
          },
        });
      }
    }
  }

  cases.push({
    id: 'scroll_prose_light_base',
    label: 'prose · light · scroll',
    render: (fonts) => {
      const rules = resolveRules({ fontSize: 18 });
      const layout = layoutScrollColumns({
        ...PASSAGES.prose(),
        rules,
        metrics: fonts.metrics,
        viewport: { width: 900, height: 420 },
      });
      return renderScrollToPng(layout, rules, fonts, THEMES.light, 2);
    },
  });

  return cases;
}

export { loadHeadlessFonts };
