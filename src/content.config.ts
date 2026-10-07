import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['embodied-ai', 'power-electronics', 'personal']),
    tags: z.array(z.string()).default([]),
    publish: z.boolean().default(false),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    status: z.enum(['ongoing', 'planned', 'complete']),
    tags: z.array(z.string()).default([]),
    order: z.number(),
    github: z.url().optional(),
  }),
});

export const collections = { blog, projects };
