import { CategoryService } from './category.service';

const categories = [
  { id: 'food', name: 'Food & Dining' },
  { id: 'dining', name: 'Food & Dining > Dining Out' },
  { id: 'travel', name: 'Travel' },
  { id: 'train', name: 'Travel > Train' },
];

describe('CategoryService suggestions', () => {
  it('prioritizes a category previously confirmed for the same merchant', async () => {
    const categoryRepo = { findAll: jest.fn().mockResolvedValue(categories) };
    const transactionRepo = {
      findCategorizedForSuggestions: jest.fn().mockResolvedValue([{
        merchant: 'Corner Cafe',
        description: null,
        category: { name: 'Food & Dining' },
        subcategory: { name: 'Food & Dining > Dining Out' },
      }]),
    };
    const service = new CategoryService(categoryRepo as any, transactionRepo as any);

    const [suggestion] = await service.suggestCategories('UPI/DR/Corner Cafe', 'EXPENSE');

    expect(suggestion).toMatchObject({
      categoryId: 'food',
      subcategoryId: 'dining',
      confidence: 98,
      reason: 'Based on your previous transactions',
    });
  });

  it('uses the curated knowledge base for an unseen merchant', async () => {
    const categoryRepo = { findAll: jest.fn().mockResolvedValue(categories) };
    const transactionRepo = { findCategorizedForSuggestions: jest.fn().mockResolvedValue([]) };
    const service = new CategoryService(categoryRepo as any, transactionRepo as any);

    const [suggestion] = await service.suggestCategories('IRCTC train booking', 'EXPENSE');

    expect(suggestion).toMatchObject({
      categoryId: 'travel',
      subcategoryId: 'train',
      confidence: 86,
      reason: 'Matched “irctc”',
    });
  });

  it('suggests merchants from the selected category before curated fallbacks', async () => {
    const categoryRepo = {
      findById: jest.fn().mockResolvedValue(categories[0]),
    };
    const transactionRepo = {
      findCategorizedForSuggestions: jest.fn().mockResolvedValue([
        { categoryId: 'food', merchant: 'Corner Cafe' },
        { categoryId: 'food', merchant: 'Corner Cafe' },
        { categoryId: 'travel', merchant: 'IRCTC' },
      ]),
    };
    const service = new CategoryService(categoryRepo as any, transactionRepo as any);

    const suggestions = await service.suggestMerchants('food', '', 'EXPENSE');

    expect(suggestions[0]).toBe('Corner Cafe');
    expect(suggestions).toContain('Zomato');
    expect(suggestions).not.toContain('IRCTC');
    expect(suggestions.length).toBeGreaterThan(10);
  });

  it('filters merchant suggestions using the typed text', async () => {
    const categoryRepo = { findById: jest.fn().mockResolvedValue(categories[0]) };
    const transactionRepo = { findCategorizedForSuggestions: jest.fn().mockResolvedValue([]) };
    const service = new CategoryService(categoryRepo as any, transactionRepo as any);

    await expect(service.suggestMerchants('food', 'swig', 'EXPENSE')).resolves.toEqual(['Swiggy']);
  });

  it('puts merchants for the selected biryani subcategory first', async () => {
    const categoryRepo = {
      findById: jest.fn(async (id: string) => id === 'biryani'
        ? { id, name: 'Food & Dining > Biryani' }
        : categories[0]),
    };
    const transactionRepo = {
      findCategorizedForSuggestions: jest.fn().mockResolvedValue([
        { categoryId: 'food', subcategoryId: 'dining', merchant: 'Corner Cafe' },
        { categoryId: 'food', subcategoryId: 'biryani', merchant: 'My Biryani Shop' },
      ]),
    };
    const service = new CategoryService(categoryRepo as any, transactionRepo as any);

    const suggestions = await service.suggestMerchants('food', '', 'EXPENSE', 'biryani');

    expect(suggestions[0]).toBe('My Biryani Shop');
    expect(suggestions.slice(0, 10)).toContain('Behrouz Biryani');
    expect(suggestions.slice(0, 10)).not.toContain('Zomato');
  });

  it.each([
    ['electronics', 'Shopping > Electronics', 'Croma'],
    ['fuel', 'Transport > Fuel', 'Indian Oil'],
    ['internet', 'Utilities > Internet', 'JioFiber'],
    ['medicines', 'Health & Medical > Medicines', 'Apollo Pharmacy'],
  ])('provides relevant merchants for the %s subcategory', async (id, name, expectedMerchant) => {
    const categoryRepo = {
      findById: jest.fn(async (requestedId: string) => requestedId === id
        ? { id, name }
        : { id: 'parent', name: name.split('>')[0].trim() }),
    };
    const transactionRepo = { findCategorizedForSuggestions: jest.fn().mockResolvedValue([]) };
    const service = new CategoryService(categoryRepo as any, transactionRepo as any);

    await expect(service.suggestMerchants('parent', '', 'EXPENSE', id)).resolves.toContain(expectedMerchant);
  });
});
