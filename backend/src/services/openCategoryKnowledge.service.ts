export interface OpenItemSuggestion {
  label: string;
  description?: string;
  source: 'Open Food Facts' | 'Open Beauty Facts' | 'Open Products Facts' | 'Wikidata' | 'OpenStreetMap';
}

interface CacheEntry {
  expiresAt: number;
  suggestions: OpenItemSuggestion[];
}

const cache = new Map<string, CacheEntry>();
const PRODUCT_SOURCE_BY_CATEGORY: Record<string, { baseUrl: string; source: OpenItemSuggestion['source'] }> = {
  'food & dining': { baseUrl: 'https://world.openfoodfacts.org', source: 'Open Food Facts' },
  groceries: { baseUrl: 'https://world.openfoodfacts.org', source: 'Open Food Facts' },
  'self grooming': { baseUrl: 'https://world.openbeautyfacts.org', source: 'Open Beauty Facts' },
  shopping: { baseUrl: 'https://world.openproductsfacts.org', source: 'Open Products Facts' },
};

const cleanLabel = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^[a-z]{2}:/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const fetchJson = async (url: string): Promise<any> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FinTrack/1.0 (category suggestions)' },
    });
    if (!response.ok) throw new Error(`Knowledge source returned ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const productSuggestions = async (category: string, query: string): Promise<OpenItemSuggestion[]> => {
  const config = PRODUCT_SOURCE_BY_CATEGORY[category.toLocaleLowerCase()];
  if (!config) return [];
  const url = `${config.baseUrl}/api/v3/taxonomy_suggestions?tagtype=categories&lc=en&string=${encodeURIComponent(query)}`;
  const payload = await fetchJson(url);
  const rows = Array.isArray(payload) ? payload : payload?.suggestions || payload?.tags || [];
  return rows.slice(0, 8).map((row: any) => ({
    label: cleanLabel(row?.name || row?.label || row?.text || row?.id || row),
    source: config.source,
  })).filter((item: OpenItemSuggestion) => item.label.length > 1);
};

const wikidataSuggestions = async (query: string): Promise<OpenItemSuggestion[]> => {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&uselang=en&type=item&limit=6&format=json&origin=*`;
  const payload = await fetchJson(url);
  return (payload?.search || []).map((row: any) => ({
    label: cleanLabel(row.label),
    description: typeof row.description === 'string' ? row.description : undefined,
    source: 'Wikidata' as const,
  })).filter((item: OpenItemSuggestion) => item.label.length > 1);
};

const openStreetMapSuggestions = async (query: string): Promise<OpenItemSuggestion[]> => {
  const url = `https://taginfo.openstreetmap.org/api/4/search/by_keyword?query=${encodeURIComponent(query)}&lang=en&page=1&rp=8`;
  const payload = await fetchJson(url);
  return (payload?.data || []).map((row: any) => ({
    label: cleanLabel(row.value || row.key),
    description: typeof row.description === 'string' ? row.description : undefined,
    source: 'OpenStreetMap' as const,
  })).filter((item: OpenItemSuggestion) => item.label.length > 1);
};

export class OpenCategoryKnowledgeService {
  async search(category: string, text: string): Promise<OpenItemSuggestion[]> {
    const query = text.trim().slice(0, 80);
    if (category.trim().length < 2 || query.length < 2) return [];
    const cacheKey = `${category.toLocaleLowerCase()}:${query.toLocaleLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.suggestions;

    const results = await Promise.allSettled([
      productSuggestions(category, query),
      wikidataSuggestions(query),
      openStreetMapSuggestions(query),
    ]);
    const merged = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
    const unique = new Map<string, OpenItemSuggestion>();
    for (const suggestion of merged) {
      const key = suggestion.label.toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, suggestion);
    }
    const suggestions = [...unique.values()].slice(0, 12);
    cache.set(cacheKey, { expiresAt: Date.now() + 10 * 60 * 1000, suggestions });
    return suggestions;
  }
}
