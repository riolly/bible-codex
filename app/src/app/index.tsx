import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBooks, getChapter, getChapterCount, openCorpus, type CorpusDb } from '@/db/corpus';
import { CodexPage, type FlipDirection } from '@/draw/codex-page';
import { CARDO, useCardoFonts } from '@/draw/fonts';
import { ScrollSurface } from '@/draw/scroll-surface';
import { PALETTE } from '@/draw/style';
import {
  layoutCodexPage,
  layoutScrollColumns,
  readingModeForViewport,
  resolveRules,
} from '@/engine/layout';
import { useReadingPosition } from '@/store/reading-position';

// The reader — the app's home surface (#10). It renders whatever the SINGLE
// current-position source holds (store/reading-position), so both navigation
// affordances land here in agreement: the picker's random-access jump and the
// Codex flip gesture (#9) drive the same `position`, and this screen re-renders
// in place. The reading MODE is derived from orientation (ADR-0016 / #9) —
// portrait = Codex, landscape = Scroll; there is no toggle.
export default function Reader() {
  const position = useReadingPosition((s) => s.position);
  const goTo = useReadingPosition((s) => s.goTo);
  const { translation, book, chapter } = position;

  const viewport = useWindowDimensions();
  const mode = readingModeForViewport(viewport);

  const { fonts, error: fontError } = useCardoFonts();
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    openCorpus()
      .then(setDb)
      .catch((e: Error) => setDbError(e.message));
  }, []);

  const error = dbError ?? fontError;

  // Book list for the current translation — queried once per (db, translation),
  // not on every chapter/book move within a translation.
  const books = useMemo(() => (db ? getBooks(db, translation) : []), [db, translation]);
  // Display name for the current book (the store carries the canonical slug).
  const bookName = useMemo(
    () => books.find((b) => b.slug === book)?.name ?? book,
    [books, book],
  );

  // The reading position also carries a canonical VERSE anchor (ADR-0016 / #14)
  // — the pixel offset is never persisted. It is stamped with the passage it
  // belongs to, so it survives a rotation (Codex⇄Scroll, same passage) yet
  // yields the chapter head on a flip or a jump to a new passage.
  const passageId = `${translation}:${book}:${chapter}`;
  const anchor = useRef<{ id: string; verse: number } | null>(null);
  const onAnchorChange = useCallback(
    (verse: number) => {
      anchor.current = { id: passageId, verse };
    },
    [passageId],
  );
  // A lazy getter, not a live read: the surface resolves it once at mount, so
  // the parent never touches ref.current during render.
  const getInitialAnchor = useCallback(
    () => (anchor.current?.id === passageId ? anchor.current.verse : null),
    [passageId],
  );

  const chapterCount = useMemo(
    () => (db ? getChapterCount(db, translation, book) : 1),
    [db, translation, book],
  );
  // Sequential flip (#9) drives the SAME position source as the picker's jump,
  // so the two navigation affordances can never disagree about where we are.
  const onFlip = useCallback(
    (direction: FlipDirection) => {
      const next = direction === 'next' ? chapter + 1 : chapter - 1;
      if (next < 1 || next > chapterCount) return; // clamp at the book's ends
      goTo({ translation, book, chapter: next });
    },
    [translation, book, chapter, chapterCount, goTo],
  );

  const rules = useMemo(() => resolveRules({ fontFamily: CARDO }), []);

  const source = useMemo(() => {
    if (!db || !fonts) return null;
    return getChapter(db, translation, book, chapter);
  }, [db, fonts, translation, book, chapter]);

  const page = useMemo(() => {
    if (!source || !fonts || mode !== 'codex') return null;
    return layoutCodexPage({ chapter, ...source, rules, metrics: fonts.metrics });
  }, [source, fonts, mode, chapter, rules]);

  const scroll = useMemo(() => {
    if (!source || !fonts || mode !== 'scroll') return null;
    return layoutScrollColumns({ chapter, ...source, rules, metrics: fonts.metrics, viewport });
  }, [source, fonts, mode, chapter, rules, viewport]);

  const surfaceReady = mode === 'codex' ? !!page : !!scroll;

  return (
    <View style={styles.root}>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>load error: {error}</Text>
        </View>
      ) : fonts && surfaceReady ? (
        // Key by passage so a flip (new chapter) remounts the surface at the
        // chapter head; a rotation keeps the same passage key but swaps the
        // component type, which remounts too and re-seeks to the carried verse.
        mode === 'codex' ? (
          <CodexPage
            key={passageId}
            page={page!}
            rules={rules}
            fonts={fonts}
            onFlip={onFlip}
            getInitialAnchor={getInitialAnchor}
            onAnchorChange={onAnchorChange}
          />
        ) : (
          <ScrollSurface
            key={passageId}
            layout={scroll!}
            rules={rules}
            fonts={fonts}
            getInitialAnchor={getInitialAnchor}
            onAnchorChange={onAnchorChange}
          />
        )
      ) : (
        <View style={styles.center} />
      )}

      {/* Position affordance: reflects where the reader is, and opens the
          picker for random access. Kept mounted even on load error so
          navigation stays reachable. */}
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
