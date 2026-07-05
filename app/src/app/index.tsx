import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBooks, getChapter, openCorpus, type CorpusDb } from '@/db/corpus';
import { CodexPage } from '@/draw/codex-page';
import { CARDO, useCardoFonts } from '@/draw/fonts';
import { PALETTE } from '@/draw/style';
import { layoutCodexPage, resolveRules } from '@/engine/layout';
import { useReadingPosition } from '@/store/reading-position';

// The reader — the app's home surface (#10). It renders whatever the SINGLE
// current-position source holds (store/reading-position), so both navigation
// affordances land here in agreement: the picker's random-access jump and the
// Codex flip gesture (#9, once it lands) drive the same `position`, and this
// screen re-renders in place. Replaces the #23 throwaway menu/reader scaffold.
export default function Reader() {
  const position = useReadingPosition((s) => s.position);
  const { translation, book, chapter } = position;

  const { fonts, error: fontError } = useCardoFonts();
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    openCorpus()
      .then(setDb)
      .catch((e: Error) => setDbError(e.message));
  }, []);

  const error = dbError ?? fontError;

  // Display name for the current book (the store carries the canonical slug).
  const bookName = useMemo(() => {
    if (!db) return book;
    return getBooks(db, translation).find((b) => b.slug === book)?.name ?? book;
  }, [db, translation, book]);

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

  return (
    <View style={styles.root}>
      {page && fonts ? (
        <CodexPage page={page} rules={rules} fonts={fonts} />
      ) : (
        <View style={styles.center} />
      )}

      {/* Position affordance: reflects where the reader is, and opens the
          picker for random access. #9 will add the sequential flip gesture. */}
      <SafeAreaView edges={['top']} style={styles.headerSafe} pointerEvents="box-none">
        <Pressable style={styles.header} onPress={() => router.push('/picker')}>
          <Text style={styles.headerTitle}>
            {bookName} {chapter}
          </Text>
          <Text style={styles.headerTranslation}>{translation}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.letterbox },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.letterbox,
  },
  error: { color: PALETTE.parchment, padding: 24 },

  headerSafe: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    alignSelf: 'center',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(34,30,25,0.55)',
  },
  headerTitle: { fontSize: 15, color: PALETTE.parchment, letterSpacing: 0.3 },
  headerTranslation: { fontSize: 11, letterSpacing: 1, color: PALETTE.gilt },
});
