import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getBooks, openCorpus, type CorpusDb } from "@/db/corpus";
import { PALETTE } from "@/draw/style";
import { groupBooks, type MenuBook } from "@/model/book-groups";

// #23 scaffold: the First-Readable-Bible book/chapter menu. Two-pane
// master/detail (prototype variant A) — grouped book list left, chapter grid
// right — over the whole corpus, so typography/scroll/perf can be dogfooded
// before the real navigation UI (#10). Deliberately isolated and cheap to
// delete; #10 must NOT inherit this structure.

const TRANSLATIONS = ["KJV", "BSB"] as const;
type Translation = (typeof TRANSLATIONS)[number];

export default function Index() {
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Translation>("KJV");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    openCorpus()
      .then(setDb)
      .catch((e: Error) => setDbError(e.message));
  }, []);

  const sections = useMemo(
    () => (db ? groupBooks(getBooks(db, translation)) : []),
    [db, translation],
  );
  const activeSlug = selected ?? sections[0]?.books[0]?.slug ?? null;
  const activeBook = useMemo(
    () =>
      sections.flatMap((s) => s.books).find((b) => b.slug === activeSlug) ??
      null,
    [sections, activeSlug],
  );

  if (dbError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>load error: {dbError}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.pane}>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          <Text style={styles.brand}>The Codex</Text>
          {sections.map((section) => (
            <View key={section.name}>
              <Text style={styles.group}>{section.name.toUpperCase()}</Text>
              {section.books.map((book) => (
                <BookRow
                  key={book.slug}
                  book={book}
                  active={book.slug === activeSlug}
                  onPress={() => setSelected(book.slug)}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <Text style={styles.bookTitle}>{activeBook?.name ?? ""}</Text>
            <TranslationToggle value={translation} onChange={setTranslation} />
          </View>
          {activeBook && (
            <Text style={styles.chapterCount}>
              {activeBook.chapters}{" "}
              {activeBook.chapters === 1 ? "chapter" : "chapters"}
            </Text>
          )}
          <ScrollView contentContainerStyle={styles.grid}>
            {activeBook &&
              Array.from({ length: activeBook.chapters }, (_, i) => i + 1).map(
                (n) => (
                  <Pressable
                    key={n}
                    style={styles.cell}
                    onPress={() =>
                      router.push({
                        pathname: "/reader",
                        params: {
                          translation,
                          book: activeBook.slug,
                          chapter: String(n),
                        },
                      })
                    }
                  >
                    <Text style={styles.cellText}>{n}</Text>
                  </Pressable>
                ),
              )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

function BookRow({
  book,
  active,
  onPress,
}: {
  book: MenuBook;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.bookRow, active && styles.bookRowActive]}
      onPress={onPress}
    >
      <Text style={[styles.bookName, active && styles.bookNameActive]}>
        {book.name}
      </Text>
      <Text style={styles.bookMeta}>{book.chapters}</Text>
    </Pressable>
  );
}

function TranslationToggle({
  value,
  onChange,
}: {
  value: Translation;
  onChange: (t: Translation) => void;
}) {
  return (
    <View style={styles.toggle}>
      {TRANSLATIONS.map((t) => {
        const on = t === value;
        return (
          <Pressable
            key={t}
            style={[styles.toggleItem, on && styles.toggleItemOn]}
            onPress={() => onChange(t)}
          >
            <Text style={[styles.toggleText, on && styles.toggleTextOn]}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const RULE = "#DCCFB4";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.parchment },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PALETTE.parchment,
  },
  error: { color: PALETTE.ink, padding: 24 },
  pane: { flex: 1, flexDirection: "row" },

  list: { width: "40%", borderRightWidth: 1, borderRightColor: RULE },
  listContent: { padding: 16, paddingBottom: 48 },
  brand: {
    fontSize: 20,
    fontWeight: 500,
    color: PALETTE.ink,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  group: {
    fontSize: 11,
    letterSpacing: 2,
    color: PALETTE.gilt,
    marginTop: 18,
    marginBottom: 6,
  },
  bookRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  bookRowActive: { backgroundColor: "#E6D6B2" },
  bookName: { fontSize: 16, color: PALETTE.ink },
  bookNameActive: { fontWeight: "700" },
  bookMeta: { fontSize: 12, color: PALETTE.muted },

  detail: { flex: 1, padding: 24 },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookTitle: { fontSize: 30, color: PALETTE.ink, flexShrink: 1 },
  chapterCount: { fontSize: 12, color: PALETTE.muted, marginBottom: 18 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 48 },
  cell: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: RULE,
    backgroundColor: "#FBF6EB",
  },
  cellText: { fontSize: 16, color: PALETTE.ink },

  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 999,
    overflow: "hidden",
  },
  toggleItem: { paddingVertical: 5, paddingHorizontal: 14 },
  toggleItemOn: { backgroundColor: PALETTE.ink },
  toggleText: { fontSize: 12, letterSpacing: 1, color: PALETTE.muted },
  toggleTextOn: { color: PALETTE.parchment },
});
