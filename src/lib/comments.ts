// These are public GitHub identifiers, not credentials.
export const comments = {
  repo: 'aurorasgod/aurorasgod.github.io',
  repoId: 'R_kgDOU_X1kA',
  category: 'Announcements',
  categoryId: 'DIC_kwDOU_X1kM4DHVBQ',
  origin: 'https://giscus.app',
  discussionUrl: 'https://github.com/aurorasgod/aurorasgod.github.io/discussions/categories/announcements',
};

// A title edit, a new domain, or a local preview must use the same thread.
export function commentTerm(slug: string) {
  return `/blog/${slug.replace(/^\/+|\/+$/g, '')}/`;
}

export function discussionMetadata(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const discussion = data.discussion as Record<string, unknown> | undefined;
  if (!discussion || typeof discussion.url !== 'string') return null;
  const prefix = `https://github.com/${comments.repo}/discussions/`;
  if (!discussion.url.startsWith(prefix) || !/^\d+$/.test(discussion.url.slice(prefix.length))) return null;
  const count = discussion.totalCommentCount;
  const replies = discussion.totalReplyCount;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0
    || typeof replies !== 'number' || !Number.isSafeInteger(replies) || replies < 0) return null;
  return { url: discussion.url, count: count + replies };
}
