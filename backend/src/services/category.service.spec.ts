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
});
