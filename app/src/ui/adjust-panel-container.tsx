/**
 * Binds the presentational AdjustPanel to the user DB: reads the live resolved
 * rules and routes every change to a mutation. Each write re-runs the panel's
 * (and the reader's) `useLiveQuery`, so edits re-typeset immediately (ADR-0004).
 */

import { Alert } from 'react-native';

import { exportUserData } from '@/backup/export-data';
import { importUserData } from '@/backup/restore-data';
import { FONT_FAMILIES } from '@/db/settings';
import { selectPreset, setTheme, updateActivePreset } from '@/db/settings-write';
import { useReadingSettings } from '@/db/use-settings';
import { useUiStore } from '@/store/ui-store';
import { AdjustPanel } from './adjust-panel';

/** Share the user DB as a backup file; surface any failure to the reader. */
async function handleExport(): Promise<void> {
  try {
    await exportUserData();
  } catch (err) {
    Alert.alert('Export failed', err instanceof Error ? err.message : 'Could not export your data.');
  }
}

/**
 * Import a backup, replacing local reading data. Confirms first (import is a
 * full replace), then on success the app RELOADS — so only the rejected /
 * canceled / error paths return here to report.
 */
function handleImport(): void {
  Alert.alert(
    'Import backup',
    'This replaces your current settings and bookmarks with the backup, then restarts the app.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const result = await importUserData();
              if (result.status === 'rejected') Alert.alert('Import failed', result.reason);
              // Swap succeeded but the app could not reload itself — ask the user
              // to relaunch. This is NOT a failure: their data is already imported.
              else if (result.status === 'needs-restart')
                Alert.alert('Import complete', 'Please restart the app to finish.');
            } catch (err) {
              Alert.alert('Import failed', err instanceof Error ? err.message : 'Could not import that file.');
            }
          })();
        },
      },
    ],
  );
}

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
      onExport={() => void handleExport()}
      onImport={handleImport}
    />
  );
}
