/**
 * Scroll-mode surface (#9, ADR-0016): paints the fixed scroll picture under a
 * HORIZONTAL scroll transform; a transparent native ScrollView drives the
 * continuous-column scroll (its physics are the journey feel) while the canvas
 * only replays one recorded picture. The column height is viewport-derived, so
 * the vertical extent fills the screen exactly.
 *
 * Reading position is held as a canonical VERSE, not a pixel offset: on mount
 * the surface seeks to `initialAnchorVerse`, and it reports the leading-edge
 * verse as the reader scrolls — so a rotation into Codex keeps the passage.
 */

import { Canvas, Fill, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useDerivedValue } from 'react-native-reanimated';

import {
  scrollOffsetForVerse,
  scrollVerseAnchors,
  type ResolvedRules,
  type ScrollLayout,
} from '../engine/layout';
import type { DrawFonts } from './fonts';
import { buildScrollPicture } from './scroll-picture';
import { PALETTE } from './style';
import { maxScroll } from './transform';
import { useVerseAnchor } from './use-verse-anchor';

export interface ScrollSurfaceProps {
  readonly layout: ScrollLayout;
  readonly rules: ResolvedRules;
  readonly fonts: DrawFonts;
  /** Lazily yields the canonical verse to seek on mount (carried across a
   * rotation) — resolved once here, never read reactively. */
  readonly getInitialAnchor?: () => number | null;
  /** Reports the leading-edge verse as the reader scrolls. */
  readonly onAnchorChange?: (verse: number) => void;
}

export function ScrollSurface({
  layout,
  rules,
  fonts,
  getInitialAnchor,
  onAnchorChange,
}: ScrollSurfaceProps) {
  const viewport = useWindowDimensions();

  // Vertical fills exactly: canvas height (em) = columnHeight + 2 margins, which
  // the engine derived from this viewport's height. dp-per-em follows from it.
  const canvasHeightEm = layout.columnHeight + 2 * rules.margin;
  const scale = viewport.height / canvasHeightEm;
  const pxScale = scale / rules.fontSize; // design px → dp
  const contentWidthDp = layout.totalWidth * scale;
  const overflow = maxScroll(contentWidthDp, viewport.width);

  const picture = useMemo(() => buildScrollPicture(layout, rules, fonts), [layout, rules, fonts]);

  // The reading position enters as a canonical verse; the shared hook seeds the
  // scroll, seeks the native ScrollView on mount, and reports as the reader
  // scrolls (see use-verse-anchor.ts).
  const anchors = useMemo(() => scrollVerseAnchors(layout, rules.margin), [layout, rules.margin]);
  const {
    initialOffset: initialX,
    scrollPos: scrollX,
    scrollRef,
    onScroll,
  } = useVerseAnchor({
    anchors,
    scale,
    overflow,
    axis: 'x',
    getInitialAnchor,
    offsetForVerse: (verse) => scrollOffsetForVerse(layout, verse, rules.margin),
    onAnchorChange,
  });

  const transform = useDerivedValue(() => [
    { translateX: -scrollX.value },
    { scale: pxScale },
  ]);

  return (
    <View style={styles.root}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Fill color={PALETTE.letterbox} />
        <Group transform={transform}>
          <Picture picture={picture} />
        </Group>
      </Canvas>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ width: viewport.width + overflow }}
        contentOffset={{ x: initialX, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={overflow > 0}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.letterbox },
});
