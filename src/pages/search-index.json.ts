import type { APIRoute } from 'astro';
import { publicPosts } from '../lib/content';
import { categoryName, url } from '../site';
export const GET: APIRoute = async () => new Response(JSON.stringify((await publicPosts()).map(p=>({title:p.data.title,description:p.data.description,category:categoryName(p.data.category),url:url(`blog/${p.id}/`),text:`${p.data.title} ${p.data.description} ${p.data.tags.join(' ')} ${p.body||''}`}))),{headers:{'Content-Type':'application/json; charset=utf-8'}});
