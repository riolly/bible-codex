/**
 * The harness shell: discovers feature dirs (design/<slug>/variants.ts), reads
 * `?feature=` / `?variant=` from the URL, renders the current variant's states
 * as PNGs, and drives the floating switcher (◀ ▶ buttons, ←/→ keys — URL-stable
 * and shareable). Each state has a Save-PNG button; the saved file is the
 * design-spec screenshot posted on the issue.
 */

import { loadDesignFonts } from './fonts';
import type { DesignFeature, DesignState, DesignVariant } from './types';

const modules = import.meta.glob('../*/variants.ts');

const slugOf = (path: string) => path.split('/')[1]!;

function param(name: string): string | null {
  return new URL(location.href).searchParams.get(name);
}

function setParam(name: string, value: string) {
  const url = new URL(location.href);
  url.searchParams.set(name, value);
  history.replaceState(null, '', url);
}

function downloadPng(name: string, bytes: Uint8Array) {
  const blob = new Blob([bytes as BlobPart], { type: 'image/png' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function runApp(root: HTMLElement) {
  const slugs = Object.keys(modules).map(slugOf).sort();
  if (slugs.length === 0) {
    root.innerHTML =
      '<p class="status">No feature dirs found. Create <code>design/&lt;slug&gt;/variants.ts</code> (see design/README.md).</p>';
    return;
  }

  const slug = param('feature') ?? slugs[0]!;
  const loader = modules[`../${slug}/variants.ts`];
  if (!loader) throw new Error(`unknown feature "${slug}" — available: ${slugs.join(', ')}`);

  root.innerHTML = '<p class="status">Loading fonts + variants…</p>';
  const [{ default: feature }, fonts] = await Promise.all([
    loader() as Promise<{ default: DesignFeature }>,
    loadDesignFonts(),
  ]);
  if (!feature?.variants?.length) throw new Error(`design/${slug}/variants.ts exports no variants`);

  // --- static chrome ---------------------------------------------------------
  root.innerHTML = '';
  const header = document.createElement('header');
  header.className = 'question';
  const h1 = document.createElement('h1');
  h1.textContent = feature.question;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = feature.issue
    ? `design/${slug} · for <a href="https://github.com/riolly/bible-codex/issues/${feature.issue}">#${feature.issue}</a>`
    : `design/${slug}`;
  header.append(h1, meta);

  const statesEl = document.createElement('main');

  const pill = document.createElement('nav');
  pill.className = 'pill';
  const prev = document.createElement('button');
  prev.textContent = '◀';
  prev.title = 'Previous variant (←)';
  const label = document.createElement('span');
  label.className = 'label';
  const next = document.createElement('button');
  next.textContent = '▶';
  next.title = 'Next variant (→)';
  pill.append(prev, label, next);
  if (slugs.length > 1) {
    const select = document.createElement('select');
    for (const s of slugs) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      opt.selected = s === slug;
      select.append(opt);
    }
    select.onchange = () => {
      const url = new URL(location.href);
      url.searchParams.set('feature', select.value);
      url.searchParams.delete('variant');
      location.href = url.toString();
    };
    pill.append(select);
  }
  root.append(header, statesEl, pill);

  // --- variant rendering -----------------------------------------------------
  const keys = feature.variants.map((v) => v.key);
  let currentKey = param('variant') ?? keys[0]!;
  let renderPass = 0;

  async function show(variant: DesignVariant) {
    const pass = ++renderPass;
    setParam('variant', variant.key);
    label.innerHTML = `<b>${variant.key}</b> — ${variant.name}`;
    statesEl.innerHTML = '<p class="status">Rendering…</p>';
    const states: DesignState[] = await variant.render({ fonts });
    if (pass !== renderPass) return; // superseded by a faster switch
    statesEl.innerHTML = '';
    for (const state of states) {
      const section = document.createElement('section');
      section.className = 'state';
      const bar = document.createElement('div');
      bar.className = 'bar';
      const h2 = document.createElement('h2');
      h2.textContent = state.label;
      const save = document.createElement('button');
      save.textContent = 'Save PNG';
      const fileLabel = state.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      save.onclick = () => downloadPng(`${slug}_${variant.key}_${fileLabel}.png`, state.image.bytes);
      bar.append(h2, save);
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([state.image.bytes as BlobPart], { type: 'image/png' }));
      img.style.width = `${state.image.width}px`;
      img.alt = `${variant.key} — ${state.label}`;
      section.append(bar, img);
      statesEl.append(section);
    }
  }

  function go(delta: number) {
    const i = keys.indexOf(currentKey);
    currentKey = keys[(i + delta + keys.length) % keys.length]!;
    const variant = feature.variants.find((v) => v.key === currentKey)!;
    void show(variant);
  }

  prev.onclick = () => go(-1);
  next.onclick = () => go(1);
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest('input, textarea, select') || target.isContentEditable)) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  const initial = feature.variants.find((v) => v.key === currentKey) ?? feature.variants[0]!;
  currentKey = initial.key;
  await show(initial);
}
