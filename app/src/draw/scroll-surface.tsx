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
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import {
  scrollOffsetForVerse,
  scrollVerseAtOffset,
  type ResolvedRules,
  type ScrollLayout,
} from '../engine/layout';
import type { DrawFonts } from './fonts';
import { buildScrollPicture } from './scroll-picture';
import { PALETTE } from './style';
import { maxScroll } from './transform';

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

  // Resolved once at mount — the reading position enters as a verse, seeked here.
  const [initialAnchorVerse] = useState(() => getInitialAnchor?.() ?? null);
  const initialX = Math.min(
    Math.max(0, scrollOffsetForVerse(layout, initialAnchorVerse ?? 0, rules.margin) * scale),
    overflow,
  );

  const lastVerse = useRef<number | null>(initialAnchorVerse);
  const report = (x: number) => {
    if (!onAnchorChange) return;
    const verse = scrollVerseAtOffset(layout, x / scale, rules.margin);
    if (verse !== null && verse !== lastVerse.current) {
      lastVerse.current = verse;
      onAnchorChange(verse);
    }
  };

  const scrollX = useSharedValue(initialX);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
    runOnJS(report)(e.contentOffset.x);
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
