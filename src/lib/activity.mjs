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
export function activityMonths(days) {
  const weeks = days.filter((_, index) => index % 7 === 0);
  const segments = [];
  weeks.forEach((day, index) => {
    const month = day.date.slice(0, 7);
    const previous = segments.at(-1);
    if (previous?.month === month) previous.length++;
    else segments.push({ month, start: index, length: 1 });
  });
  // A month name needs three week columns; omit a short leading partial month.
  const labels = segments.filter((segment, index) => index > 0 || segment.length >= 3).map(segment => ({
    label: `${Number(segment.month.slice(5))}月`,
    start: Math.min(segment.start, Math.max(0, weeks.length - 3)),
    span: 3,
    align: segment.start > weeks.length - 3 ? 'end' : 'start',
  }));
  for (let index = labels.length - 2; index >= 0; index--) {
    labels[index].start = Math.min(labels[index].start, labels[index + 1].start - labels[index].span);
  }
  return labels.filter(label => label.start >= 0);
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
