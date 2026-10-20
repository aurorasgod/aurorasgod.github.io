import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  site: process.env.SITE_URL || 'https://aurorasgod.github.io',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  devToolbar: { enabled: false },
  redirects: { '/designs/nocturne/': '/' },
  integrations: [sitemap({ filter: page => !/\/designs(?:\/|$)|\/library\//.test(new URL(page).pathname) })],
  markdown: {
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
