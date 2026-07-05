import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PALETTE } from '@/draw/style';

/**
 * The bundled translations, in display order — the single list both the picker
 * and the reader header switch between (#12). Extends when a corpus is added.
 */
export const TRANSLATIONS = ['KJV', 'BSB'] as const;
export type Translation = (typeof TRANSLATIONS)[number];

/** Segmented KJV|BSB control. `variant` tunes it for a light surface (the
 * picker's parchment detail pane) or a dark one (the reader's letterbox pill). */
export function TranslationToggle({
  value,
  onChange,
  variant = 'light',
}: {
  value: string;
  onChange: (t: Translation) => void;
  variant?: 'light' | 'dark';
}) {
  const v = variant === 'dark' ? dark : light;
  return (
    <View style={[styles.toggle, v.toggle]}>
      {TRANSLATIONS.map((t) => {
        const on = t === value;
        return (
          <Pressable
            key={t}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Show ${t}`}
            style={[styles.item, on && v.itemOn]}
            onPress={() => onChange(t)}
          >
            <Text style={[styles.text, v.text, on && v.textOn]}>{t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const RULE = '#DCCFB4';

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', borderRadius: 999, overflow: 'hidden', borderWidth: 1 },
  item: { paddingVertical: 5, paddingHorizontal: 14 },
  text: { fontSize: 12, letterSpacing: 1 },
});

const light = StyleSheet.create({
  toggle: { borderColor: RULE },
  itemOn: { backgroundColor: PALETTE.ink },
  text: { color: PALETTE.muted },
  textOn: { color: PALETTE.parchment },
});

const dark = StyleSheet.create({
  toggle: { borderColor: 'rgba(232,221,203,0.35)' },
  itemOn: { backgroundColor: PALETTE.gilt },
  text: { color: PALETTE.parchment },
  textOn: { color: PALETTE.letterbox },
});
