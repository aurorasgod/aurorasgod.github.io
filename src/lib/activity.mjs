export function dayKey(value = new Date()) {
  return new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
export function activityWindow(now = new Date()) {
  const today = dayKey(now);
  const end = new Date(`${today}T00:00:00Z`);
  const sunday = new Date(end);
  sunday.setUTCDate(end.getUTCDate() - end.getUTCDay());
  const start = new Date(sunday);
  start.setUTCDate(start.getUTCDate() - 25 * 7);
  return Array.from({length:182}, (_, i) => {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + i);
    return { date:date.toISOString().slice(0,10), future:date > end };
  });
}
// Updates have a fixed contribution; visits grow logarithmically.
export function activityLevel(updates, visits) {
  const weight = updates * 4 + Math.log2(visits + 1);
  return weight === 0 ? 0 : weight < 2 ? 1 : weight < 4 ? 2 : weight < 7 ? 3 : 4;
}
export function contentActivity(posts) {
  const counts = new Map();
  for (const post of posts) {
    const dates = new Set([dayKey(post.data.pubDate)]);
    if (post.data.updatedDate && new Date(post.data.updatedDate) <= new Date()) dates.add(dayKey(post.data.updatedDate));
    for (const date of dates) counts.set(date, (counts.get(date) || 0) + 1);
  }
  return Object.fromEntries(counts);
}
