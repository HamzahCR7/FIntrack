export interface AIQueryRequest {
  query: string;
  contextHistory?: Array<{ sender: 'user' | 'assistant'; text: string }>;
}

export interface AIToolCall {
  toolName: string;
  toolParams?: Record<string, any>;
}

export interface AIOrchestrationPlan {
  intent: string;
  level: 1 | 2 | 3 | 4; // 1: Facts, 2: Analysis, 3: Insights, 4: Guidance
  toolCalls: AIToolCall[];
  capability?: string;
  entities?: {
    category?: string;
    itemName?: string;
    amount?: number;
    date?: string;
    description?: string;
    targetMonths?: number;
    targetMonthlySavings?: number;
    targetSavingsRate?: number;
    changeAmount?: number;
    frequency?: string;
    instrument?: string;
    targetAmount?: number;
  };
  requiredContext?: string[];
  clarification?: string;
  /** Semantic representation used by the universal financial planner. */
  action?: string;
  object?: string;
  questionType?: string;
}

export interface AIQueryResponse {
  query: string;
  intent: string;
  capability?: string;
  toolUsed: string;
  toolCallsExecuted: AIToolCall[];
  toolParameters?: Record<string, any>;
  data: any;
  answer: string;
  suggestedFollowUps?: string[];
}

export interface AIReasoningResult {
  answer: string;
  suggestedFollowUps?: string[];
}

export interface IAIProvider {
  processQuery(request: AIQueryRequest): Promise<AIOrchestrationPlan>;
  /** Optional second-pass reasoning over verified backend data. */
  reasonOverFinancialContext?(
    request: AIQueryRequest,
    plan: AIOrchestrationPlan,
    verifiedData: Record<string, any>
  ): Promise<AIReasoningResult>;
}
