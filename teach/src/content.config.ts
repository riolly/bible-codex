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
    eyebrow: z.string().optional(),
    lede: z.string(),
    summary: z.string(),
    /** breadcrumb shown in the nav, e.g. "Module 0 · Overview · Lesson 1" */
    here: z.string().optional(),
    /** id the lesson's check marks complete (defaults to the lesson id) */
    completeId: z.string().optional(),
  }),
});

export const collections = { lessons };
