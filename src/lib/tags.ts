export const normalizeText = (value: string) => value.toLocaleLowerCase().normalize('NFKC');
export const tagLabel = (value: string) => value.normalize('NFKC').trim().replace(/^#+/, '').trim();
export const tagKey = (value: string) => normalizeText(tagLabel(value));

export function cleanTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.map(tagLabel).filter(tag => {
    const key = tagKey(tag);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function matchesSearch(text: string, tags: string[], query: string) {
  const terms = normalizeText(query.trim()).split(/\s+/).filter(Boolean);
  const keys = tags.map(tagKey);
  return terms.every(term => term.startsWith('#')
    ? !tagKey(term) || keys.includes(tagKey(term))
    : normalizeText(text).includes(term));
}
