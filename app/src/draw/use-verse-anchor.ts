/**
 * Verse-anchored scroll seam shared by both reading surfaces (#9, ADR-0016).
 * The reading position is a canonical VERSE, never a pixel offset: on mount the
 * surface seeks to the carried verse, and it reports the leading-edge verse as
 * the reader scrolls, so a rotation keeps the passage. Codex scrolls vertically
 * (axis 'y'), Scroll horizontally (axis 'x'); everything else is identical, so
 * both surfaces drive their transparent ScrollView through this one hook.
 */

import { useEffect, useRef, useState } from 'react';
import Animated, {
  runOnJS,
  runOnUI,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

import { verseAtAnchorOffset, type VerseAnchor } from '../engine/layout';

export type ScrollAxis = 'x' | 'y';

export interface UseVerseAnchorInput {
  /** Ascending verse anchors for the active layout, in canvas-em. */
  readonly anchors: readonly VerseAnchor[];
  /** dp per em along the scroll axis. */
  readonly scale: number;
  /** Scrollable overflow in dp — the seek clamp. */
  readonly overflow: number;
  /** 'y' for Codex (vertical), 'x' for Scroll (horizontal). */
  readonly axis: ScrollAxis;
  /** Lazily yields the canonical verse to seek on mount (carried across a
   *  rotation) — resolved once here, never read reactively. */
  readonly getInitialAnchor?: () => number | null;
  /** Canvas-em offset of a verse's leading edge (the mount-seek target). */
  readonly offsetForVerse: (verse: number) => number;
  /** Reports the leading-edge verse as the reader scrolls. */
  readonly onAnchorChange?: (verse: number) => void;
}

export interface VerseAnchorBinding {
  /** dp offset to seed the ScrollView with, clamped to the scroll range. */
  readonly initialOffset: number;
  /** The live scroll offset (dp) driving the picture transform. */
  readonly scrollPos: SharedValue<number>;
  /** Attach to the transparent Animated.ScrollView so the mount-seek can reach it. */
  readonly scrollRef: AnimatedRef<Animated.ScrollView>;
  readonly onScroll: ReturnType<typeof useAnimatedScrollHandler>;
}

export function useVerseAnchor({
  anchors,
  scale,
  overflow,
  axis,
  getInitialAnchor,
  offsetForVerse,
  onAnchorChange,
}: UseVerseAnchorInput): VerseAnchorBinding {
  // Resolve the carried verse once at mount; its dp offset is recomputed each
  // render (cheap) so a viewport change re-clamps without a re-seek.
  const [initialVerse] = useState(() => getInitialAnchor?.() ?? null);
  const initialOffset = Math.min(
    Math.max(0, offsetForVerse(initialVerse ?? 0) * scale),
    overflow,
  );

  const lastVerse = useRef<number | null>(initialVerse);
  const report = (pos: number) => {
    if (!onAnchorChange) return;
    const verse = verseAtAnchorOffset(anchors, pos / scale);
    if (verse !== null && verse !== lastVerse.current) {
      lastVerse.current = verse;
      onAnchorChange(verse);
    }
  };

  const scrollPos = useSharedValue(initialOffset);
  const onScroll = useAnimatedScrollHandler((e) => {
    const pos = axis === 'y' ? e.contentOffset.y : e.contentOffset.x;
    scrollPos.value = pos;
    runOnJS(report)(pos);
  });

  // Seek the native ScrollView imperatively as well as through `contentOffset`:
  // that prop is unreliable across platforms/mount timing, and if it no-ops the
  // native offset desyncs from the picture (already seeded via `scrollPos`) and
  // the first touch snaps to the top. scrollTo keeps both in lockstep.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  useEffect(() => {
    if (initialOffset <= 0) return;
    const x = axis === 'x' ? initialOffset : 0;
    const y = axis === 'y' ? initialOffset : 0;
    runOnUI(() => {
      scrollTo(scrollRef, x, y, false);
    })();
    // Mount-only seek; a rotation remounts the surface with a fresh anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { initialOffset, scrollPos, scrollRef, onScroll };
}
