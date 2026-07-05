import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getChapter, openCorpus, type CorpusDb } from '@/db/corpus';
import { CodexPage } from '@/draw/codex-page';
import { CARDO, useCardoFonts } from '@/draw/fonts';
import { PALETTE } from '@/draw/style';
import { layoutCodexPage, resolveRules } from '@/engine/layout';

// #23 scaffold reader: renders whatever chapter the book/chapter menu (index)
// routed to, as a Codex-mode Page (#8). Throwaway plumbing — the real reading
// surface + navigation is #10; keep this param-driven and cheap to delete.
export default function Reader() {
  const params = useLocalSearchParams<{ translation?: string; book?: string; chapter?: string }>();
  const translation = params.translation ?? 'KJV';
  const book = params.book ?? 'Genesis';
  const chapter = Number(params.chapter ?? '1');

  const { fonts, error: fontError } = useCardoFonts();
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    openCorpus()
      .then(setDb)
      .catch((e: Error) => setDbError(e.message));
  }, []);

  const error = dbError ?? fontError;

  const rules = useMemo(() => resolveRules({ fontFamily: CARDO }), []);
  const page = useMemo(() => {
    if (!db || !fonts) return null;
    const { blocks, tokens } = getChapter(db, translation, book, chapter);
    return layoutCodexPage({ chapter, blocks, tokens, rules, metrics: fonts.metrics });
  }, [db, fonts, rules, translation, book, chapter]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>load error: {error}</Text>
      </View>
    );
  }
  if (!page || !fonts) {
    return <View style={styles.center} />;
  }
  return <CodexPage page={page} rules={rules} fonts={fonts} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.letterbox },
  error: { color: PALETTE.parchment, padding: 24 },
});
