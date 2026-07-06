import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBooks, getChapter, getChapterCount, openCorpus, type CorpusDb } from '@/db/corpus';
import { setActiveTranslation } from '@/db/settings-write';
import { useReadingBookmark, type PassageAnchor } from '@/db/use-bookmark';
import { useReadingSettings } from '@/db/use-settings';
import { CodexPage, type FlipDirection } from '@/draw/codex-page';
import { useCardoFonts } from '@/draw/fonts';
import { ScrollSurface } from '@/draw/scroll-surface';
import { PALETTE } from '@/draw/style';
import { layoutCodexPage, layoutScrollColumns, readingModeForViewport } from '@/engine/layout';
import { bookmarkFromPosition } from '@/model/bookmark';
import { anchorKey, positionKey } from '@/model/reading-position';
import { useReadingPosition } from '@/store/reading-position';
import { useUiStore } from '@/store/ui-store';
import { AdjustPanelContainer } from '@/ui/adjust-panel-container';
import { TranslationToggle, type Translation } from '@/ui/translation-toggle';

// The reader — the app's home surface (#10). It renders whatever the SINGLE
// current-position source holds (store/reading-position), so both navigation
// affordances land here in agreement: the picker's random-access jump and the
// Codex flip gesture (#9) drive the same `position`, and this screen re-renders
// in place. The reading MODE is derived from orientation (ADR-0016 / #9) —
// portrait = Codex, landscape = Scroll; there is no toggle. The typography +
// theme come from the layout-adjust settings (#11): a preset/knob/theme change
// re-typesets immediately.
export default function Reader() {
  const position = useReadingPosition((s) => s.position);
  const goTo = useReadingPosition((s) => s.goTo);
  const { translation, book, chapter } = position;

  const viewport = useWindowDimensions();
  const mode = readingModeForViewport(viewport);

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

  // Book list for the current translation — queried once per (db, translation),
  // not on every chapter/book move within a translation.
  const books = useMemo(() => (db ? getBooks(db, translation) : []), [db, translation]);
  // Display name for the current book (the store carries the canonical slug).
  const bookName = useMemo(
    () => books.find((b) => b.slug === book)?.name ?? book,
    [books, book],
  );

  // The Skia surface is KEYED by translation+passage (positionKey), so any
  // change (flip, rotation, translation switch) remounts it with fresh text.
  const passageId = positionKey(position);
  // The reading position also carries a canonical VERSE anchor (ADR-0016 / #14)
  // — the pixel offset is never persisted. Its identity is CANONICAL and
  // translation-free (anchorKey = book:chapter): token.verse is stored canonical
  // (av11n), so the same verse ports directly across the bundled translations.
  // That lets the anchor survive a rotation AND a KJV⇄BSB switch (same canonical
  // passage, ADR-0012), while a flip or a jump to a new chapter resets it to the
  // head.
  const anchor = useRef<PassageAnchor | null>(null);
  // The durable bookmark (#14): restores this same anchor + position on cold
  // open and persists every settled verse. `persist` is a no-op until restore
  // has run, so the cold-open default never clobbers the real last bookmark.
  const persist = useReadingBookmark(anchor);
  const onAnchorChange = useCallback(
    (verse: number) => {
      anchor.current = { id: anchorKey(position), verse };
      // Save the book's bookmark at verse grain — canonical-only, no pixels.
      persist(bookmarkFromPosition(position, verse));
    },
    [position, persist],
  );
  // A lazy getter, not a live read: the surface resolves it once at mount, so
  // the parent never touches ref.current during render.
  const getInitialAnchor = useCallback(
    () => (anchor.current?.id === anchorKey(position) ? anchor.current.verse : null),
    [position],
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

  // Rules come from the layout-adjust cascade (#11): base preset + any per-book
  // override, resolved at book grain. Depend on the stable `rulesFor` (memoized
  // in the hook), NOT the settings object — that literal is rebuilt every render
  // and would defeat this memo, re-shaping the Skia picture each frame.
  const settings = useReadingSettings();
  const { rulesFor, palette, activeTranslation, ready: settingsReady } = settings;

  // Cold-open seed (#12): reopen in the last-chosen translation. One-shot — once
  // the durable settings row resolves, adopt its translation and then step back;
  // later toggles drive the store directly and must not be overwritten here.
  const translationSeeded = useRef(false);
  // Set the instant the user picks a translation. If a toggle beats the async
  // settings load, the (now stale) seed must NOT clobber that choice back — the
  // user's write is already in flight and will win in the durable row.
  const userChoseTranslation = useRef(false);
  useEffect(() => {
    if (!settingsReady || translationSeeded.current) return;
    translationSeeded.current = true;
    if (userChoseTranslation.current) return; // user already chose before the seed resolved
    const p = useReadingPosition.getState().position;
    if (activeTranslation !== p.translation) goTo({ ...p, translation: activeTranslation });
  }, [settingsReady, activeTranslation, goTo]);

  // Switch translation in place (#12): re-typeset the SAME passage under the new
  // translation (book+chapter kept; the canonical verse anchor ports across),
  // and persist the choice so a cold open reopens here. Layout-adjust settings
  // are canonical-keyed, so they survive the switch untouched.
  const onChangeTranslation = useCallback(
    (next: Translation) => {
      userChoseTranslation.current = true;
      if (next === translation) return;
      goTo({ translation: next, book, chapter });
      void setActiveTranslation(next);
    },
    [translation, book, chapter, goTo],
  );
  const rules = useMemo(
    () => rulesFor({ genre: 'prose', role: null, bookSlug: book }),
    [rulesFor, book],
  );

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
    <View style={[styles.root, { backgroundColor: palette.letterbox }]}>
      {error ? (
        <View style={[styles.center, { backgroundColor: palette.letterbox }]}>
          <Text style={[styles.error, { color: palette.parchment }]}>load error: {error}</Text>
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
            palette={palette}
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
            palette={palette}
            getInitialAnchor={getInitialAnchor}
            onAnchorChange={onAnchorChange}
          />
        )
      ) : (
        <View style={[styles.center, { backgroundColor: palette.letterbox }]} />
      )}

      {/* Position affordance: the book/chapter opens the picker (random access);
          the translation toggle switches in place (#12). Two separate touch
          targets in one pill. Kept mounted even on load error so navigation
          stays reachable. */}
      <SafeAreaView edges={['top']} style={styles.headerSafe} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable onPress={() => router.push('/picker')} hitSlop={8}>
            <Text style={styles.headerTitle}>
              {bookName} {chapter}
            </Text>
          </Pressable>
          <TranslationToggle value={translation} onChange={onChangeTranslation} variant="dark" />
        </View>
      </SafeAreaView>

      {/* Layout-adjust affordance (#11): opens the preset/knob/theme panel. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open adjust"
        style={[styles.adjustBtn, { backgroundColor: palette.gilt }]}
        onPress={() => setAdjustOpen(true)}
      >
        <Text style={[styles.adjustText, { color: palette.letterbox }]}>Aa</Text>
      </Pressable>
      <AdjustPanelContainer />
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
