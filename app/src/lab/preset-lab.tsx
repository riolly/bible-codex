/**
 * The __DEV__ preset lab (#41, ADR-0018 pillar 6): the fixed judging spread
 * rendered per candidate through the production layout + paint path, side by
 * side; the demoted adjust panel tweaks the SELECTED candidate's local
 * working copy (the user DB is never touched); Export emits paste-ready TS
 * constant source. Dev builds only — the route (app/lab.tsx) gates on
 * __DEV__ so release bundles drop this whole module graph.
 */

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layoutCodexPage } from '@/engine/layout';
import type { PresetSlug } from '@/engine/layout';
import { useCardoFonts } from '@/draw/fonts';
import { THEMES } from '@/draw/style';
import { FONT_FAMILIES } from '@/db/settings';
import { AdjustPanel } from '@/ui/adjust-panel';
import { candidateRules, labPalette } from './candidates';
import { LabPagePreview } from './lab-page-preview';
import { labSpread } from './lab-spread';
import { sharePresetSource } from './share-export';
import { useLabState } from './use-lab-state';

/**
 * The spread's cascade context. PAGE-grain, like the production reader
 * (app/index.tsx resolves one prose context per chapter) — so a builtin's
 * per-genre internal override (Classic's poetry indent) does NOT show on the
 * Psalm blocks yet. Block-grain resolution is upstream engine work; when the
 * reader gains it, the lab inherits it through the same seam.
 */
const SPREAD_CONTEXT = { genre: 'prose', role: null, bookSlug: 'Genesis' } as const;

const GUTTER = 12;

export function PresetLab() {
  const lab = useLabState();
  const { fonts, error } = useCardoFonts();
  const viewport = useWindowDimensions();
  const [panelOpen, setPanelOpen] = useState(true);

  const spread = useMemo(() => labSpread(), []);
  const paneWidth = (viewport.width - GUTTER * 3) / lab.candidates.length;
  const paneHeight = viewport.height * 0.55;

  const panes = useMemo(() => {
    if (!fonts) return [];
    return lab.candidates.map((candidate) => {
      const rules = candidateRules(candidate, SPREAD_CONTEXT);
      return {
        candidate,
        rules,
        page: layoutCodexPage({
          ...spread,
          rules,
          metrics: fonts.metrics,
          verseNumberStyle: candidate.preset.verseNumber,
          runningHead: { bookName: candidate.label, locator: 'Lab spread' },
          runningHeadStyle: candidate.preset.runningHead,
        }),
        palette: labPalette(candidate, lab.theme),
      };
    });
  }, [fonts, lab.candidates, lab.theme, spread]);

  const chrome = THEMES[lab.theme];

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: chrome.letterbox }]}>
        <Text style={{ color: chrome.parchment }}>Font load failed: {error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: chrome.letterbox }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.headerAction, { color: chrome.gilt }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: chrome.parchment }]}>Preset Lab</Text>
          <Pressable accessibilityRole="button" onPress={() => setPanelOpen(true)} hitSlop={8}>
            <Text style={[styles.headerAction, { color: chrome.gilt }]}>Adjust</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {fonts ? (
        <View style={styles.panes}>
          {panes.map(({ candidate, rules, page, palette }) => (
            <LabPagePreview
              key={candidate.id}
              label={candidate.label}
              page={page}
              rules={rules}
              fonts={fonts}
              palette={palette}
              width={paneWidth}
              height={paneHeight}
              selected={candidate.id === lab.selectedId}
              onSelect={() => lab.select(candidate.id)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={{ color: chrome.muted }}>Loading fonts…</Text>
        </View>
      )}

      <AdjustPanel
        visible={panelOpen}
        theme={lab.theme}
        palette={chrome}
        values={lab.selectedValues}
        fontFamilies={FONT_FAMILIES}
        presets={lab.candidates.map((c) => ({ id: c.id, name: c.label }))}
        activePresetId={lab.selectedId}
        onClose={() => setPanelOpen(false)}
        onTheme={lab.setTheme}
        onSelectPreset={(id) => lab.select(id as PresetSlug)}
        onFontFamily={(fontFamily) => lab.tweak({ fontFamily })}
        onFontSize={(fontSize) => lab.tweak({ fontSize })}
        onLineHeight={(lineHeight) => lab.tweak({ lineHeight })}
        onMeasure={(measure) => lab.tweak({ measure })}
        onMargin={(railWidth) => lab.tweak({ railWidth })}
        onExport={() => void sharePresetSource(lab.selected.preset, lab.exportSelected())}
        onImport={lab.reset}
        importLabel="Reset"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '600' },
  headerAction: { fontSize: 15, fontWeight: '600' },
  panes: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-start',
    paddingTop: 8,
  },
});
