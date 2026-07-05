/**
 * Codex-mode Page surface (#8/#9, ADR-0016): paints the fixed page picture
 * under the letterbox transform; a transparent native ScrollView drives
 * internal overflow scroll (pillar 3) so the physics feel native while the
 * canvas only replays one recorded picture.
 *
 * Rotation/device change = viewing operation: the same PageLayout re-fits via
 * fitPageToViewport — never a re-typeset (pillar 2). A horizontal FLING is
 * chapter navigation (flip = the codex gesture). Reading position is held as a
 * canonical VERSE, not a pixel offset — seeked on mount, reported on scroll.
 */

import { Canvas, Fill, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useDerivedValue } from 'react-native-reanimated';

import {
  codexOffsetForVerse,
  codexVerseAnchors,
  fitPageToViewport,
  type PageLayout,
  type ResolvedRules,
} from '../engine/layout';
import type { DrawFonts } from './fonts';
import { buildPagePicture } from './page-picture';
import { PALETTE } from './style';
import { maxScroll } from './transform';
import { useVerseAnchor } from './use-verse-anchor';

export type FlipDirection = 'prev' | 'next';

export interface CodexPageProps {
  readonly page: PageLayout;
  readonly rules: ResolvedRules;
  readonly fonts: DrawFonts;
  /** Flip = chapter navigation (previous/next Page). */
  readonly onFlip?: (direction: FlipDirection) => void;
  /** Lazily yields the canonical verse to seek on mount (carried across a
   * rotation) — resolved once here, never read reactively. */
  readonly getInitialAnchor?: () => number | null;
  /** Reports the leading-edge verse as the reader scrolls. */
  readonly onAnchorChange?: (verse: number) => void;
}

export function CodexPage({
  page,
  rules,
  fonts,
  onFlip,
  getInitialAnchor,
  onAnchorChange,
}: CodexPageProps) {
  const viewport = useWindowDimensions();
  const fit = fitPageToViewport(page, viewport);
  // Picture is recorded in design px (em × fontSize); scale design px → dp.
  const pxScale = fit.scale / rules.fontSize;
  const pageHeightDp = page.canvas.height * fit.scale;
  const overflow = maxScroll(pageHeightDp, viewport.height);

  const picture = useMemo(() => buildPagePicture(page, rules, fonts), [page, rules, fonts]);

  // The reading position enters as a canonical verse; the shared hook seeds the
  // scroll, seeks the native ScrollView on mount, and reports as the reader
  // scrolls (see use-verse-anchor.ts).
  const anchors = useMemo(() => codexVerseAnchors(page), [page]);
  const {
    initialOffset: initialY,
    scrollPos: scrollY,
    scrollRef,
    onScroll,
  } = useVerseAnchor({
    anchors,
    scale: fit.scale,
    overflow,
    axis: 'y',
    getInitialAnchor,
    offsetForVerse: (verse) => codexOffsetForVerse(page, verse),
    onAnchorChange,
  });

  const transform = useDerivedValue(() => [
    { translateX: fit.offsetX },
    { translateY: fit.offsetY - scrollY.value },
    { scale: pxScale },
  ]);

  // Flip = chapter navigation: fling left → next Page, right → previous. A
  // horizontal fling never fights the vertical overflow scroll.
  const flingNext = Gesture.Fling()
    .direction(Directions.LEFT)
    .onEnd(() => onFlip && runOnJS(onFlip)('next'));
  const flingPrev = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onEnd(() => onFlip && runOnJS(onFlip)('prev'));
  const flip = Gesture.Race(flingNext, flingPrev);

  return (
    <GestureDetector gesture={flip}>
      <View style={styles.root}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill color={PALETTE.letterbox} />
          <Group transform={transform}>
            <Picture picture={picture} />
          </Group>
        </Canvas>
        <Animated.ScrollView
          ref={scrollRef}
          style={StyleSheet.absoluteFill}
          contentContainerStyle={{ height: viewport.height + overflow }}
          contentOffset={{ x: 0, y: initialY }}
          onScroll={onScroll}
          scrollEventThrottle={16}
          scrollEnabled={overflow > 0}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.letterbox },
});
