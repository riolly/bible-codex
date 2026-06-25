import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One lesson per .mdx file. `module`/`order` drive the course spine; the file
// stem is the global lesson id (0001, 0002, …). `completeId` is the id the
// lesson's terminal check marks done (usually the lesson id itself).
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    module: z.number(),
    order: z.number(),
    /** the "you are here" line above the H1, e.g. "Phase 1 — Reading · Lesson 3" */
    eyebrow: z.string().optional(),
    lede: z.string(),
    summary: z.string(),
    /** id the lesson's check marks complete (defaults to the lesson id) */
    completeId: z.string().optional(),
  }),
});

export const collections = { lessons };
