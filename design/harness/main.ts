/**
 * Entry: boot CanvasKit FIRST, then dynamically import the app shell — the
 * web-Skia shim reads globalThis.CanvasKit at module evaluation, so nothing
 * Skia-touching may load before the boot resolves.
 */

import { bootCanvasKit } from './boot';

async function start() {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app missing');
  try {
    await bootCanvasKit();
    const { runApp } = await import('./app');
    await runApp(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'error';
    box.textContent = err instanceof Error ? (err.stack ?? err.message) : String(err);
    root.append(box);
  }
}

void start();
