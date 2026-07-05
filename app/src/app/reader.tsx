import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { getChapter, getChapterCount, openCorpus, type CorpusDb } from '@/db/corpus';
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

// #23 scaffold reader: renders whatever chapter the book/chapter menu (index)
// routed to. Mode is DERIVED from orientation (ADR-0016) — portrait = Codex,
// landscape = Scroll; there is no toggle. Throwaway plumbing — the real reading
// surface + navigation is #10; keep this param-driven and cheap to delete.
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

  // The reading position, held as a canonical VERSE (ADR-0016 / #14) — the pixel
  // offset is never persisted. It is stamped with the passage it belongs to, so
  // it carries the verse across a rotation (Codex⇄Scroll, same passage) yet
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
  const onFlip = useCallback(
    (direction: FlipDirection) => {
      const next = direction === 'next' ? chapter + 1 : chapter - 1;
      if (next < 1 || next > chapterCount) return; // clamp at the book's ends
      router.setParams({ chapter: String(next) });
    },
    [chapter, chapterCount],
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

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>load error: {error}</Text>
      </View>
    );
  }
  if (!fonts || (mode === 'codex' ? !page : !scroll)) {
    return <View style={styles.center} />;
  }

  // Key by passage so a flip (new chapter) remounts the surface at the chapter
  // head; a rotation keeps the same passage key but swaps the component type,
  // which remounts too and re-seeks to the carried verse.
  return mode === 'codex' ? (
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
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: PALETTE.letterbox },
  error: { color: PALETTE.parchment, padding: 24 },
});
