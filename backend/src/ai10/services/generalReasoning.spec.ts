import { AIAssistantService } from './aiAssistant.service';
import { DeterministicAIProvider } from '../providers/deterministicProvider';

describe('general financial reasoning orchestration', () => {
  const registry = {
    getFinancialOverview: jest.fn().mockResolvedValue({ totalBalance: 50000, totalIncome: 100000 }),
    getCashFlowAnalysis: jest.fn().mockResolvedValue({ inflow: 100000, outflow: 70000 }),
    getExpensesByCategory: jest.fn().mockResolvedValue({ categoryName: 'Food & Dining', totalSpent: 6000 }),
    getUpcomingObligations: jest.fn().mockResolvedValue({ upcomingSubscriptions: [] }),
  };
  const service = new AIAssistantService(registry as any, new DeterministicAIProvider());

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['Can I afford a ₹2,000 dinner?', 'FINANCIAL_DECISION', 'PURCHASE_AFFORDABILITY'],
    ['Can I afford a ₹20,000 phone?', 'FINANCIAL_DECISION', 'PURCHASE_AFFORDABILITY'],
    ['What happens if I spend ₹20,000 today?', 'FINANCIAL_SCENARIO', 'SCENARIO_ANALYSIS'],
  ])('handles %s as a generic capability', async (query, intent, capability) => {
    const response = await service.processUserQuery({ query });
    expect(response.intent).toBe(intent);
    expect(response.toolUsed).toBe(capability);
    expect(response.data).toBeDefined();
    expect(response.answer).not.toContain('searched your financial ledger');
  });

  it('does not query financial data for general knowledge or greetings', async () => {
    const knowledge = await service.processUserQuery({ query: 'What is compound interest?' });
    const greeting = await service.processUserQuery({ query: 'Hello' });
    expect(knowledge.intent).toBe('FINANCIAL_KNOWLEDGE');
    expect(greeting.intent).toBe('GENERAL_CONVERSATION');
    expect(registry.getFinancialOverview).not.toHaveBeenCalled();
    expect(registry.getCashFlowAnalysis).not.toHaveBeenCalled();
  });

  it('asks for missing purchase information instead of searching the ledger', async () => {
    const response = await service.processUserQuery({ query: 'Can I afford it?' });
    expect(response.answer).toContain('approximately how much');
    expect(response.toolUsed).toBe('none');
    expect(registry.getFinancialOverview).not.toHaveBeenCalled();
  });
});