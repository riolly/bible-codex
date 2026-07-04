import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getChapter, openCorpus, type CorpusDb } from '@/db/corpus';
import { CodexPage } from '@/draw/codex-page';
import { CARDO, useCardoFonts } from '@/draw/fonts';
import { PALETTE } from '@/draw/style';
import { layoutCodexPage, resolveRules } from '@/engine/layout';

// #8 slice: ONE fixed chapter as a Codex-mode Page. Psalm 119 exercises every
// acceptance edge at once: 176 verses (internal overflow scroll), gilt Hebrew
// acrostic headings (RTL shaping), poetry indents, a psalm superscription.
// Navigation is #10; the book/chapter mini-menu is #23.
const TRANSLATION = 'KJV';
const BOOK_SLUG = 'Psalms';
const CHAPTER = 119;

export default function Index() {
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
    const { blocks, tokens } = getChapter(db, TRANSLATION, BOOK_SLUG, CHAPTER);
    return layoutCodexPage({ chapter: CHAPTER, blocks, tokens, rules, metrics: fonts.metrics });
  }, [db, fonts, rules]);

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
