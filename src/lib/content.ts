import { getCollection, type CollectionEntry } from 'astro:content';
import { cleanTags } from './tags';

export function isPublicPost(post: CollectionEntry<'blog'>) {
  return post.data.publish && !post.data.draft && post.data.pubDate.valueOf() <= Date.now();
}

export async function publicPosts() {
  return (await getCollection('blog', isPublicPost))
    .map(post => ({ ...post, data: { ...post.data, tags: cleanTags(post.data.tags) } }))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function readingMinutes(body = '') {
  const words = body.replace(/```[\s\S]*?```/g, '').match(/[\u3400-\u9fff]|[\w]+/g) || [];
  return Math.max(1, Math.ceil(words.length / 320));
}

export function dateLabel(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai' }).format(date);
}

export function dateISO(date: Date) { return date.toISOString().slice(0, 10); }
