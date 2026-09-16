import { TransactionRepository } from './transaction.repository';

describe('TransactionRepository.findByDateRange', () => {
  it('exists and returns an array for a date range query', async () => {
    const repo = new TransactionRepository();

    const result = await repo.findByDateRange(new Date('2024-01-01'), new Date('2024-01-31'));

    expect(Array.isArray(result)).toBe(true);
  });
});
