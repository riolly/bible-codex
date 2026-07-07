/**
 * User-facing reading settings (#44): shipped preset cards, the single
 * fontScale stepper, and global theme. The open-knob AdjustPanel is reserved
 * for the __DEV__ preset lab.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Palette, Theme } from '@/draw/style';

export interface SettingsPresetChoice {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly paperTint: string;
}

export interface SettingsSurfaceProps {
  readonly visible: boolean;
  readonly theme: Theme;
  readonly palette: Palette;
  readonly presets: readonly SettingsPresetChoice[];
  readonly activePresetId: string | null;
  readonly fontScale: number;
  readonly onClose: () => void;
  readonly onTheme: (theme: Theme) => void;
  readonly onSelectPreset: (id: string) => void;
  readonly onFontScale: (fontScale: number) => void;
}

const FONT_SCALE_MIN = 0.75;
const FONT_SCALE_MAX = 1.5;
const FONT_SCALE_STEP = 0.05;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export function SettingsSurface(props: SettingsSurfaceProps) {
  if (!props.visible) return null;

  const normalizedFontScale = Number.isFinite(props.fontScale) ? props.fontScale : 1;
  const fontScale = clamp(normalizedFontScale, FONT_SCALE_MIN, FONT_SCALE_MAX);
  const stepFontScale = (delta: number) =>
    props.onFontScale(round2(clamp(fontScale + delta, FONT_SCALE_MIN, FONT_SCALE_MAX)));

  return (
    <View style={[styles.sheet, { backgroundColor: props.palette.letterbox }]} accessibilityViewIsModal>
      <View style={styles.header}>
        <Text style={[styles.title, { color: props.palette.parchment }]}>Settings</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close settings" onPress={props.onClose}>
          <Text style={[styles.close, { color: props.palette.gilt }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preset</Text>
          <View style={styles.presetGrid}>
            {props.presets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                selected={preset.id === props.activePresetId}
                palette={props.palette}
                onPress={() => props.onSelectPreset(preset.id)}
              />
            ))}
          </View>
        </View>

        <Stepper
          label="Font scale"
          value={`${Math.round(fontScale * 100)}%`}
          palette={props.palette}
          onDec={() => stepFontScale(-FONT_SCALE_STEP)}
          onInc={() => stepFontScale(FONT_SCALE_STEP)}
        />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Theme</Text>
          <View style={styles.themeChoices}>
            {(['light', 'dark'] as const).map((theme) => (
              <Choice
                key={theme}
                label={theme === 'light' ? 'Light' : 'Dark'}
                selected={props.theme === theme}
                palette={props.palette}
                onPress={() => props.onTheme(theme)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function PresetCard({
  preset,
  selected,
  palette,
  onPress,
}: {
  preset: SettingsPresetChoice;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${preset.name} preset`}
      onPress={onPress}
      style={[
        styles.presetCard,
        { borderColor: selected ? palette.gilt : '#4A4238' },
        selected && { backgroundColor: 'rgba(168,132,44,0.16)' },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: palette.parchment }]}>{preset.name}</Text>
        <View style={[styles.paperSwatch, { backgroundColor: preset.paperTint, borderColor: palette.muted }]} />
      </View>
      <Text style={[styles.cardDescription, { color: palette.muted }]}>{preset.description}</Text>
    </Pressable>
  );
}

function Choice({
  label,
  selected,
  palette,
  onPress,
}: {
  label: string;
  selected: boolean;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.choice, selected && { backgroundColor: palette.gilt }]}
    >
      <Text style={{ color: selected ? palette.letterbox : palette.parchment }}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  palette,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  palette: Palette;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={onDec}
          style={styles.step}
        >
          <Text style={[styles.stepText, { color: palette.parchment }]}>-</Text>
        </Pressable>
        <Text style={[styles.value, { color: palette.parchment }]}>{value}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={onInc}
          style={styles.step}
        >
          <Text style={[styles.stepText, { color: palette.parchment }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '72%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '600' },
  close: { fontSize: 16, fontWeight: '600' },
  body: { paddingHorizontal: 20, paddingTop: 8, gap: 18 },
  section: { gap: 10 },
  sectionLabel: { color: '#9A8E7C', fontSize: 14 },
  presetGrid: { gap: 10 },
  presetCard: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  paperSwatch: { width: 26, height: 18, borderRadius: 4, borderWidth: 1 },
  cardDescription: { fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#9A8E7C', fontSize: 14, flexShrink: 0 },
  themeChoices: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  choice: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#4A4238' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22 },
  value: { minWidth: 56, textAlign: 'center', fontSize: 16 },
});
