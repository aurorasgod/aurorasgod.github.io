import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publicPosts } from '../lib/content';
import { site, url } from '../site';
export async function GET(context: APIContext){return rss({title:`${site.title} · ${site.chineseTitle}`,description:site.description,site:context.site!,items:(await publicPosts()).map(p=>({title:p.data.title,description:p.data.description,pubDate:p.data.pubDate,link:url(`blog/${p.id}/`)})),customData:'<language>zh-cn</language>'});}
