/**
 * The fixed judging spread (#41, ADR-0018 pillar 6): Genesis prose, a Psalm,
 * a heading — the one passage mix every preset candidate is judged against.
 * Built from the engine's pure-TS ChapterBuilder (no corpus DB), same style
 * as the visual-goldens passages (scenes.ts is node-only; this runs on
 * device). Verse numbers run continuously so every ornament paints.
 */

import { ChapterBuilder } from '@/engine/layout/fixtures';

export function labSpread() {
  return new ChapterBuilder(1)
    .block({ genre: 'heading', role: 'section', text: 'The Creation' })
    .block({
      genre: 'prose',
      verse: 1,
      text: 'In the beginning God created the heaven and the earth .',
    })
    .block({
      genre: 'prose',
      verse: 2,
      text: 'And the earth was without form , and void ; and darkness was upon the face of the deep .',
    })
    .block({
      genre: 'prose',
      verse: 3,
      text: 'And God said , Let there be light : and there was light .',
    })
    .block({ genre: 'heading', role: 'psalm_title', text: 'A Psalm of David .' })
    .block({ genre: 'poetry', indent: 1, verse: 4, text: 'Blessed is the man' })
    .block({
      genre: 'poetry',
      indent: 2,
      verse: 4,
      text: 'that walketh not in the counsel of the ungodly ,',
    })
    .block({ genre: 'poetry', indent: 1, verse: 5, text: 'But his delight is in the law of the LORD ;' })
    .block({
      genre: 'poetry',
      indent: 2,
      verse: 5,
      text: 'and in his law doth he meditate day and night .',
    })
    .build();
}
