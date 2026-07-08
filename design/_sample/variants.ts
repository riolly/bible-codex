/**
 * TEMPLATE + harness demo — `_sample` is not a live design question. Copy this
 * file's shape into `design/<feature-slug>/variants.ts` for a real gate. It
 * demos the two render paths a variant can use:
 *   - the production engine + draw layer (all three variants here), and
 *   - `renderCustom` from harness/render.ts for looks the engine can't
 *     produce yet (fake, never build).
 */

import { THEMES } from '@app/draw/style';
import {
  BUILTIN_PRESETS,
  layoutCodexPage,
  resolveRules,
  type ResolvedRules,
  type RunningHeadStyle,
  type SectionBreakStyle,
  type VersalStyle,
  type VerseNumberStyle,
} from '@app/engine/layout';
import { miniChapter } from '@app/engine/layout/fixtures';

import { renderPage } from '../harness/render';
import type { DesignFeature, DesignState, RenderCtx } from '../harness/types';

const chapter = miniChapter();

interface Ornaments {
  readonly verseNumber: VerseNumberStyle;
  readonly runningHead: RunningHeadStyle;
  readonly versal: VersalStyle;
  readonly sectionBreak: SectionBreakStyle;
}

function pageStates(ctx: RenderCtx, rules: ResolvedRules, ornaments: Ornaments): DesignState[] {
  return (['light', 'dark'] as const).map((theme) => {
    const page = layoutCodexPage({
      ...chapter,
      rules,
      metrics: ctx.fonts.metrics,
      verseNumberStyle: ornaments.verseNumber,
      versalStyle: ornaments.versal,
      sectionBreakStyle: ornaments.sectionBreak,
      runningHead: { bookName: 'Genesis', locator: 'Chapter 1' },
      runningHeadStyle: ornaments.runningHead,
      bookStart: true,
    });
    return {
      label: `${theme} · ${rules.fontSize}px`,
      image: renderPage(page, rules, ctx.fonts, THEMES[theme]),
    };
  });
}

const feature: DesignFeature = {
  question: 'TEMPLATE — how far apart can page personality swing on the same chapter?',
  variants: [
    {
      key: 'A',
      name: 'Classic preset',
      render: (ctx) => pageStates(ctx, BUILTIN_PRESETS.classic, BUILTIN_PRESETS.classic),
    },
    {
      key: 'B',
      name: 'Modern preset',
      render: (ctx) => pageStates(ctx, BUILTIN_PRESETS.modern, BUILTIN_PRESETS.modern),
    },
    {
      key: 'C',
      name: 'Airy rag-right (custom rules)',
      render: (ctx) =>
        pageStates(
          ctx,
          resolveRules({
            fontSize: 18,
            align: 'left',
            margin: 3.4,
            lineHeight: 1.9,
            paragraphSpacing: 1,
            measure: 24,
          }),
          BUILTIN_PRESETS.modern,
        ),
    },
  ],
};

export default feature;
