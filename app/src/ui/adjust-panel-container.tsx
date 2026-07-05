/**
 * Binds the presentational AdjustPanel to the user DB: reads the live resolved
 * rules and routes every change to a mutation. Each write re-runs the panel's
 * (and the reader's) `useLiveQuery`, so edits re-typeset immediately (ADR-0004).
 */

import { FONT_FAMILIES } from '@/db/settings';
import { selectPreset, setTheme, updateActivePreset } from '@/db/settings-write';
import { useReadingSettings } from '@/db/use-settings';
import { useUiStore } from '@/store/ui-store';
import { AdjustPanel } from './adjust-panel';

/** The neutral context whose resolved base the panel's steppers display. */
const DISPLAY_CONTEXT = { genre: 'prose', role: null, bookSlug: '' } as const;

export function AdjustPanelContainer() {
  const open = useUiStore((s) => s.adjustPanelOpen);
  const setOpen = useUiStore((s) => s.setAdjustPanelOpen);
  const settings = useReadingSettings();
  const rules = settings.rulesFor(DISPLAY_CONTEXT);

  return (
    <AdjustPanel
      visible={open}
      theme={settings.theme}
      palette={settings.palette}
      values={{
        fontFamily: rules.fontFamily,
        fontSize: rules.fontSize,
        lineHeight: rules.lineHeight,
        measure: rules.measure,
        railWidth: rules.railWidth,
      }}
      fontFamilies={FONT_FAMILIES}
      presets={settings.presets.map((p) => ({ id: p.id, name: p.name }))}
      activePresetId={settings.activePreset?.id ?? null}
      onClose={() => setOpen(false)}
      onTheme={(t) => void setTheme(t)}
      onSelectPreset={(id) => void selectPreset(id)}
      onFontFamily={(f) => void updateActivePreset({ fontFamily: f })}
      onFontSize={(v) => void updateActivePreset({ fontSize: v })}
      onLineHeight={(v) => void updateActivePreset({ lineHeight: v })}
      onMeasure={(v) => void updateActivePreset({ measure: v })}
      onMargin={(v) => void updateActivePreset({ railWidth: v })}
    />
  );
}
