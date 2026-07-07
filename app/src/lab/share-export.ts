/**
 * Preset-lab export plumbing (#41, RN-bound): hand the emitted TS constant
 * source to the developer. Always logs to the Metro console (the zero-friction
 * path); then offers the OS share sheet with a `.ts` file, following the
 * backup export's pattern (share from the non-backed-up cache dir, no
 * post-share delete — the receiver may still be reading it).
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { BuiltinPreset } from '@/engine/layout';
import { emitPresetSource } from './emit-preset';

/**
 * Emit + deliver one candidate. Console first (always works, even where the
 * share sheet is unavailable, e.g. some emulators); share sheet best-effort.
 */
export async function sharePresetSource(
  preset: BuiltinPreset,
  source = emitPresetSource(preset),
): Promise<void> {
  console.log(`[preset-lab] ${preset.slug} →\n${source}`);

  const file = new File(Paths.cache, `preset-${preset.slug}.ts`);
  if (file.exists) file.delete();
  file.write(source);

  if (!(await Sharing.isAvailableAsync())) return; // console already has it
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/plain',
    dialogTitle: `Export ${preset.name} preset`,
    UTI: 'public.plain-text',
  });
}
