/**
 * Binds the release SettingsSurface to the user DB. Selection writes only the
 * builtin preset slug, fontScale writes only the user's scale multiplier, and
 * theme stays global.
 */

import { BUILTIN_PRESETS, type PresetSlug } from '@/engine/layout';
import { selectPreset, setFontScale, setTextEdition, setTheme } from '@/db/settings-write';
import { useReadingSettings } from '@/db/use-settings';
import { useUiStore } from '@/store/ui-store';
import { SettingsSurface, type SettingsPresetChoice } from './settings-surface';

const PRESET_DESCRIPTIONS: Record<PresetSlug, string> = {
  classic: 'Traditional print Bible: justified prose, drop-cap openings, warm paper.',
  modern: 'Contemporary reading: airy spacing, left-aligned prose, cooler paper.',
};

export function SettingsSurfaceContainer() {
  const open = useUiStore((s) => s.settingsSurfaceOpen);
  const setOpen = useUiStore((s) => s.setSettingsSurfaceOpen);
  const settings = useReadingSettings();

  const presets: readonly SettingsPresetChoice[] = Object.values(BUILTIN_PRESETS).map((preset) => ({
    id: preset.slug,
    name: preset.name,
    description: PRESET_DESCRIPTIONS[preset.slug],
    paperTint: preset.paper[settings.theme],
  }));

  return (
    <SettingsSurface
      visible={open}
      theme={settings.theme}
      palette={settings.palette}
      presets={presets}
      activePresetId={settings.activePreset.slug}
      fontScale={settings.fontScale}
      textEdition={settings.textEdition}
      onClose={() => setOpen(false)}
      onTheme={(theme) => void setTheme(theme)}
      onSelectPreset={(slug) => void selectPreset(slug)}
      onFontScale={(fontScale) => void setFontScale(fontScale)}
      onTextEdition={(textEdition) => void setTextEdition(textEdition)}
    />
  );
}
