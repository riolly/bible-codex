/**
 * Codex-mode Page surface (#8, ADR-0016): paints the fixed page picture under
 * the letterbox transform; a transparent native ScrollView drives internal
 * overflow scroll (pillar 3) so the physics feel native while the canvas only
 * replays one recorded picture.
 *
 * Rotation/device change = viewing operation: the same PageLayout re-fits via
 * fitPageToViewport — never a re-typeset (pillar 2).
 */

import { Canvas, Fill, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { fitPageToViewport, type PageLayout, type ResolvedRules } from '../engine/layout';
import type { DrawFonts } from './fonts';
import { buildPagePicture } from './page-picture';
import { PALETTE } from './style';
import { maxScroll } from './transform';

export interface CodexPageProps {
  readonly page: PageLayout;
  readonly rules: ResolvedRules;
  readonly fonts: DrawFonts;
}

export function CodexPage({ page, rules, fonts }: CodexPageProps) {
  const viewport = useWindowDimensions();
  const fit = fitPageToViewport(page, viewport);
  // Picture is recorded in design px (em × fontSize); scale design px → dp.
  const pxScale = fit.scale / rules.fontSize;
  const pageHeightDp = page.canvas.height * fit.scale;
  const overflow = maxScroll(pageHeightDp, viewport.height);

  const picture = useMemo(() => buildPagePicture(page, rules, fonts), [page, rules, fonts]);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const transform = useDerivedValue(() => [
    { translateX: fit.offsetX },
    { translateY: fit.offsetY - scrollY.value },
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
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{ height: viewport.height + overflow }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={overflow > 0}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.letterbox },
});
