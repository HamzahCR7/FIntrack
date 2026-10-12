import { OpenCategoryKnowledgeService } from './openCategoryKnowledge.service';

describe('OpenCategoryKnowledgeService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('merges and deduplicates read-only open-data suggestions', async () => {
    const fetchMock = jest.spyOn(global, 'fetch' as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ suggestions: [{ id: 'en:milk' }] }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ search: [{ label: 'Milk', description: 'food produced by mammals' }] }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ value: 'dairy', description: 'shop selling dairy products' }] }) } as any);

    const suggestions = await new OpenCategoryKnowledgeService().search('Groceries', 'milk-test-query');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(suggestions).toEqual([
      { label: 'Milk', source: 'Open Food Facts' },
      { label: 'Dairy', description: 'shop selling dairy products', source: 'OpenStreetMap' },
    ]);
  });
});
