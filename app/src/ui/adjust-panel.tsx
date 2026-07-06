/**
 * The layout-adjust panel (#11) — presentational only. It renders the current
 * resolved rules and reports every change through callbacks; the container
 * (adjust-panel-container.tsx) binds those to the user-DB mutations, which
 * re-typeset the page reactively (ADR-0004). Kept prop-driven so it unit-tests
 * without the expo-sqlite client.
 *
 * "Margin" is the Codex Margin-rail width (ADR-0016 pillar 4): widening it
 * grows the page canvas OUTWARD; the text measure and line breaks never change.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Theme, Palette } from '@/draw/style';

/** One tunable magnitude the panel exposes as a stepper. */
export interface AdjustValues {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly measure: number;
  readonly railWidth: number;
}

export interface PresetChoice {
  readonly id: string;
  readonly name: string;
}

export interface AdjustPanelProps {
  readonly visible: boolean;
  readonly theme: Theme;
  readonly palette: Palette;
  readonly values: AdjustValues;
  readonly fontFamilies: readonly string[];
  readonly presets: readonly PresetChoice[];
  readonly activePresetId: string | null;
  readonly onClose: () => void;
  readonly onTheme: (theme: Theme) => void;
  readonly onSelectPreset: (id: string) => void;
  readonly onFontFamily: (family: string) => void;
  readonly onFontSize: (next: number) => void;
  readonly onLineHeight: (next: number) => void;
  readonly onMeasure: (next: number) => void;
  /** The Margin-rail width; expands the canvas outward only (ADR-0016). */
  readonly onMargin: (next: number) => void;
  /** Export the user DB to a portable backup file (#13). */
  readonly onExport: () => void;
  /** Import a backup file, replacing local reading data (#13). */
  readonly onImport: () => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

export function AdjustPanel(props: AdjustPanelProps) {
  const { visible, palette, values } = props;
  if (!visible) return null;

  return (
    <View style={[styles.sheet, { backgroundColor: palette.letterbox }]} accessibilityViewIsModal>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.parchment }]}>Adjust</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close adjust" onPress={props.onClose}>
          <Text style={[styles.close, { color: palette.gilt }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Segment label="Theme">
          {(['light', 'dark'] as const).map((t) => (
            <Choice
              key={t}
              label={t === 'light' ? 'Light' : 'Dark'}
              selected={props.theme === t}
              palette={palette}
              onPress={() => props.onTheme(t)}
            />
          ))}
        </Segment>

        <Segment label="Preset">
          {props.presets.map((p) => (
            <Choice
              key={p.id}
              label={p.name}
              selected={p.id === props.activePresetId}
              palette={palette}
              onPress={() => props.onSelectPreset(p.id)}
            />
          ))}
        </Segment>

        <Segment label="Font">
          {props.fontFamilies.map((f) => (
            <Choice
              key={f}
              label={f}
              selected={f === values.fontFamily}
              palette={palette}
              onPress={() => props.onFontFamily(f)}
            />
          ))}
        </Segment>

        <Stepper
          label="Size"
          value={`${Math.round(values.fontSize)}`}
          palette={palette}
          onDec={() => props.onFontSize(clamp(values.fontSize - 1, 12, 32))}
          onInc={() => props.onFontSize(clamp(values.fontSize + 1, 12, 32))}
        />
        <Stepper
          label="Line spacing"
          value={values.lineHeight.toFixed(2)}
          palette={palette}
          onDec={() => props.onLineHeight(clamp(round2(values.lineHeight - 0.05), 1.2, 2.2))}
          onInc={() => props.onLineHeight(clamp(round2(values.lineHeight + 0.05), 1.2, 2.2))}
        />
        <Stepper
          label="Measure"
          value={`${Math.round(values.measure)}`}
          palette={palette}
          onDec={() => props.onMeasure(clamp(values.measure - 1, 20, 45))}
          onInc={() => props.onMeasure(clamp(values.measure + 1, 20, 45))}
        />
        <Stepper
          label="Margin"
          value={`${Math.round(values.railWidth)}`}
          palette={palette}
          onDec={() => props.onMargin(clamp(values.railWidth - 1, 4, 16))}
          onInc={() => props.onMargin(clamp(values.railWidth + 1, 4, 16))}
        />

        <Segment label="Data">
          <Choice label="Export" selected={false} palette={palette} onPress={props.onExport} />
          <Choice label="Import" selected={false} palette={palette} onPress={props.onImport} />
        </Segment>
      </ScrollView>
    </View>
  );
}

function Segment({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.choices}>{children}</View>
    </View>
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
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={onDec} style={styles.step}>
          <Text style={[styles.stepText, { color: palette.parchment }]}>−</Text>
        </Pressable>
        <Text style={[styles.value, { color: palette.parchment }]}>{value}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={onInc} style={styles.step}>
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
    maxHeight: '70%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: '#9A8E7C', fontSize: 14, flexShrink: 0 },
  choices: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: 12 },
  choice: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#4A4238' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  step: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22 },
  value: { minWidth: 48, textAlign: 'center', fontSize: 16 },
});
