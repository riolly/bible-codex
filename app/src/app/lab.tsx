/**
 * /lab — the __DEV__ preset lab route (#41). The require sits INSIDE the
 * __DEV__ branch so Metro's dead-code elimination drops the entire src/lab
 * module graph from release bundles; the stub that remains just redirects
 * home (the entry pill is also __DEV__-only, so release never lands here).
 */

import { Redirect } from 'expo-router';

export default function LabRoute() {
  // The require must sit INSIDE an `if (__DEV__)` BLOCK: Metro's constant
  // folding prunes the false branch before dependency collection, dropping the
  // whole src/lab graph from release. (An early-return `if (!__DEV__)` does
  // NOT get pruned — verified by grepping an exported release bundle.)
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PresetLab } = require('@/lab/preset-lab') as typeof import('@/lab/preset-lab');
    return <PresetLab />;
  }
  return <Redirect href="/" />;
}
