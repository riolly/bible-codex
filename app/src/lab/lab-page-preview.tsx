/**
 * One preset-lab pane (#41): a candidate's typeset spread painted through the
 * PRODUCTION path — layoutCodexPage output → buildPagePicture → Skia Picture
 * under a fitPageToViewport transform — exactly CodexPage minus its gestures
 * and verse anchoring, at an explicit pane viewport so two candidates sit
 * side by side (CodexPage fits itself to the window). Tap = select.
 */

import { Canvas, Fill, Group, Picture } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fitPageToViewport, type PageLayout, type ResolvedRules } from '@/engine/layout';
import type { DrawFonts } from '@/draw/fonts';
import { buildPagePicture } from '@/draw/page-picture';
import type { Palette } from '@/draw/style';

export interface LabPagePreviewProps {
  readonly label: string;
  readonly page: PageLayout;
  readonly rules: ResolvedRules;
  readonly fonts: DrawFonts;
  readonly palette: Palette;
  readonly width: number;
  readonly height: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
}

export function LabPagePreview(props: LabPagePreviewProps) {
  const { label, page, rules, fonts, palette, width, height, selected, onSelect } = props;

  const fit = fitPageToViewport(page, { width, height });
  // Picture is recorded in design px (em × fontSize); scale design px → dp.
  const pxScale = fit.scale / rules.fontSize;
  const pageHeightDp = page.canvas.height * fit.scale;

  const picture = useMemo(
    () => buildPagePicture(page, rules, fonts, palette),
    [page, rules, fonts, palette],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${label}`}
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={[
        { width, height },
        styles.pane,
        selected && { borderColor: palette.gilt },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Canvas style={{ width, height: Math.max(height, pageHeightDp) }}>
          <Fill color={palette.letterbox} />
          <Group
            transform={[
              { translateX: fit.offsetX },
              { translateY: Math.max(fit.offsetY, 0) },
              { scale: pxScale },
            ]}
          >
            <Picture picture={picture} />
          </Group>
        </Canvas>
      </ScrollView>
      <View style={styles.badge} pointerEvents="none">
        <Text style={[styles.badgeText, { color: palette.gilt }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pane: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 6,
    left: 10,
  },
  badgeText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});
