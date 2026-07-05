import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useReadingSettings } from '@/db/use-settings';
import { getChapter, openCorpus, type CorpusDb } from '@/db/corpus';
import { CodexPage } from '@/draw/codex-page';
import { useCardoFonts } from '@/draw/fonts';
import { layoutCodexPage } from '@/engine/layout';
import { useUiStore } from '@/store/ui-store';
import { AdjustPanelContainer } from '@/ui/adjust-panel-container';

// #23 scaffold reader: renders whatever chapter the book/chapter menu (index)
// routed to, as a Codex-mode Page (#8). Now reactive to the layout-adjust
// settings (#11): a preset/knob/theme change re-typesets immediately. Throwaway
// plumbing — the real reading surface + navigation is #10.
/** A route param arrives as a string, a repeated-key array, or undefined — take the first value. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function Reader() {
  const params = useLocalSearchParams<{ translation?: string; book?: string; chapter?: string }>();
  const translation = first(params.translation) ?? 'KJV';
  const book = first(params.book) ?? 'Genesis';
  const parsedChapter = Number(first(params.chapter));
  const chapter = Number.isInteger(parsedChapter) && parsedChapter > 0 ? parsedChapter : 1;

  const { fonts, error: fontError } = useCardoFonts();
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const setAdjustOpen = useUiStore((s) => s.setAdjustPanelOpen);

  useEffect(() => {
    openCorpus()
      .then(setDb)
      .catch((e: Error) => setDbError(e.message));
  }, []);

  const error = dbError ?? fontError;

  const settings = useReadingSettings();
  // A Codex Page is fixed geometry (ADR-0016): resolve ONE rule set for the
  // whole chapter at book grain (base preset + any per-book override).
  const rules = useMemo(
    () => settings.rulesFor({ genre: 'prose', role: null, bookSlug: book }),
    [settings, book],
  );

  const page = useMemo(() => {
    if (!db || !fonts) return null;
    const { blocks, tokens } = getChapter(db, translation, book, chapter);
    return layoutCodexPage({ chapter, blocks, tokens, rules, metrics: fonts.metrics });
  }, [db, fonts, rules, translation, book, chapter]);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: settings.palette.letterbox }]}>
        <Text style={{ color: settings.palette.parchment, padding: 24 }}>load error: {error}</Text>
      </View>
    );
  }
  if (!page || !fonts) {
    return <View style={[styles.center, { backgroundColor: settings.palette.letterbox }]} />;
  }
  return (
    <View style={styles.root}>
      <CodexPage page={page} rules={rules} fonts={fonts} palette={settings.palette} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open adjust"
        style={[styles.adjustBtn, { backgroundColor: settings.palette.gilt }]}
        onPress={() => setAdjustOpen(true)}
      >
        <Text style={[styles.adjustText, { color: settings.palette.letterbox }]}>Aa</Text>
      </Pressable>
      <AdjustPanelContainer />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  adjustBtn: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  adjustText: { fontSize: 20, fontWeight: '600' },
});
