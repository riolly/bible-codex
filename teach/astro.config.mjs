// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';

// Teaching workspace. Zero-JS by default (Astro), hydrate only the
// interactive islands (Preact). MDX so lessons are prose + inline islands.
export default defineConfig({
  site: 'http://localhost:4321',
  integrations: [preact(), mdx()],
  // This is a reading-focused teaching site; keep the dev view distraction-free.
  devToolbar: { enabled: false },
});
