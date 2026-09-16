const SENSITIVE_KEY_PATTERN = /(account|card|cvv|pin|upi|credential|password|token|api.?key|balance|income|expense|transaction|debt|subscription|investment|net.?worth|financial|salary|credit.?limit|statement|receipt)/i;
const SENSITIVE_VALUE_PATTERNS = [
  /\b\d{12,19}\b/,
  /\b\d{3,4}\b/,
  /\b[^\s@]+@upi\b/i,
];

export interface ExternalAIRequest {
  query: string;
  allowedTools: string[];
  metadata?: Record<string, string | number | boolean>;
}

/** Final defense-in-depth gate for every payload sent to an external AI provider. */
export function validateExternalAIRequest(request: ExternalAIRequest): void {
  if (!request || typeof request !== 'object') {
    throw new Error('External AI request must be an object');
  }

  inspectExternalAIPayload(request);

  if (typeof request.query !== 'string' || request.query.length > 500) {
    throw new Error('External AI request query is invalid');
  }

  if (!Array.isArray(request.allowedTools) || request.allowedTools.some((tool) => typeof tool !== 'string')) {
    throw new Error('External AI request tools are invalid');
  }
}

function inspectValue(value: unknown, path: string, options: { allowFinancialContext?: boolean } = {}): void {
  if (typeof value === 'string') {
    const insideFinancialContext = options.allowFinancialContext &&
      (path === 'payload.financialContext' || path.startsWith('payload.financialContext.'));
    if (!insideFinancialContext && SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      throw new Error(`Sensitive data detected in external AI request at ${path}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectValue(item, `${path}[${index}]`, options));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const insideFinancialContext = options.allowFinancialContext &&
        (path === 'payload.financialContext' || path.startsWith('payload.financialContext.'));
      if (SENSITIVE_KEY_PATTERN.test(key) && !insideFinancialContext) {
        throw new Error(`Sensitive field detected in external AI request at ${path}.${key}`);
      }
      inspectValue(child, `${path}.${key}`, options);
    });
  }
}

export function inspectExternalAIPayload(
  payload: unknown,
  options: { allowFinancialContext?: boolean } = {}
): void {
  inspectValue(payload, 'payload', options);
}
