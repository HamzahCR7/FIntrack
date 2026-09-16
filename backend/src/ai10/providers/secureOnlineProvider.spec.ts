import { SecureOnlineAIProvider } from './secureOnlineProvider';
import { validateExternalAIRequest } from './externalAIPrivacyGuard';

describe('SecureOnlineAIProvider privacy boundary', () => {
  const originalEnv = process.env;
  const fetchMock = jest.fn();
  const sensitiveFinancialData = {
    accountNumber: '123456789012',
    cardNumber: '4111111111111111',
    balance: 85420,
    salary: 100000,
    expense: 8420,
    upiId: 'user@upi',
  };

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-openai-key', GEMINI_API_KEY: '' };
    fetchMock.mockReset();
    global.fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          intent: 'CURRENT_BALANCE',
          level: 1,
          toolCalls: [{ toolName: 'getCurrentBalance', toolParams: {} }],
        }) } }],
      }),
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each([
    'What is my balance?',
    'What was my salary this month?',
    'How much did I spend this month?',
    'How much credit card debt do I have?',
    'What are my subscriptions?',
    'What is my net worth?',
    'Show me my transactions.',
    'Give me financial advice.',
  ])('sends only the user question for: %s', async (query) => {
    await new SecureOnlineAIProvider().processQuery({ query });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody.messages).toEqual(expect.arrayContaining([
      { role: 'user', content: query },
    ]));
    expect(JSON.stringify(requestBody)).not.toContain('123456789012');
    expect(JSON.stringify(requestBody)).not.toContain('4111111111111111');
    expect(JSON.stringify(requestBody)).not.toContain('85420');
    expect(JSON.stringify(requestBody)).not.toContain('100000');
    expect(JSON.stringify(requestBody)).not.toContain('8420');
    expect(JSON.stringify(requestBody)).not.toContain('user@upi');
    Object.values(sensitiveFinancialData).forEach((value) => {
      expect(JSON.stringify(requestBody)).not.toContain(String(value));
    });
  });

  it('rejects sensitive fields before an outbound request', () => {
    expect(() => validateExternalAIRequest({
      query: 'What is my balance?',
      allowedTools: ['getCurrentBalance'],
      metadata: { accountNumber: '123456789012' },
    } as any)).toThrow(/Sensitive field/);
  });

  it('does not send a query containing an account number', async () => {
    const plan = await new SecureOnlineAIProvider().processQuery({
      query: 'What is the balance for account 123456789012?',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(plan.intent).toBeDefined();
  });

  it('does not send context history containing financial data', async () => {
    await new SecureOnlineAIProvider().processQuery({
      query: 'What is my balance?',
      contextHistory: [{
        sender: 'assistant',
        text: `Your balance is ${sensitiveFinancialData.balance}; account ${sensitiveFinancialData.accountNumber}`,
      }],
    });

    const requestBody = JSON.stringify(fetchMock.mock.calls[0][1].body);
    expect(requestBody).not.toContain(String(sensitiveFinancialData.balance));
    expect(requestBody).not.toContain(sensitiveFinancialData.accountNumber);
  });

  it('applies the same boundary to Gemini requests', async () => {
    process.env.OPENAI_API_KEY = '';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        intent: 'CURRENT_BALANCE',
        level: 1,
        toolCalls: [{ toolName: 'getCurrentBalance', toolParams: {} }],
      }) }] } }] }),
    });

    await new SecureOnlineAIProvider().processQuery({ query: 'What is my balance?' });

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(JSON.stringify(requestBody)).toContain('What is my balance?');
    expect(JSON.stringify(requestBody)).not.toContain('85420');
    expect(JSON.stringify(requestBody)).not.toContain('123456789012');
  });
});