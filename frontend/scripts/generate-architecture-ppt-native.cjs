const path = require('path');
const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'GitHub Copilot';
pptx.company = 'FinTrack';
pptx.subject = 'FinTrack sequence diagrams';
pptx.title = 'FinTrack Architecture Sequence Diagrams (Visual)';

const C = {
  bg: '0F172A',
  panel: '111827',
  border: '1F2937',
  text: 'E5E7EB',
  muted: '94A3B8',
  accent: '38BDF8',
  ok: '22C55E',
  warn: 'F59E0B',
};

function addTitle(slide, title, subtitle) {
  slide.background = { color: C.bg };
  slide.addText(title, {
    x: 0.6,
    y: 0.32,
    w: 12.1,
    h: 0.5,
    fontFace: 'Segoe UI Semibold',
    fontSize: 24,
    color: 'FFFFFF',
    bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 0.86,
      w: 12.1,
      h: 0.25,
      fontFace: 'Segoe UI',
      fontSize: 11,
      color: C.muted,
    });
  }
  slide.addShape(pptx.ShapeType.line, {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    h: 0,
    line: { color: '1E293B', pt: 1 },
  });
}

function addFooter(slide, page) {
  slide.addText(`FinTrack Architecture | ${page}`, {
    x: 0.6,
    y: 7.1,
    w: 12,
    h: 0.2,
    fontFace: 'Segoe UI',
    fontSize: 9,
    color: '64748B',
    align: 'right',
  });
}

function drawSequence(slide, participants, steps, opts = {}) {
  const panelX = 0.55;
  const panelY = 1.45;
  const panelW = 12.25;
  const panelH = 5.7;
  const headY = panelY + 0.28;
  const headH = 0.38;
  const lifeTop = headY + headH + 0.05;
  const lifeBottom = panelY + panelH - 0.2;

  slide.addShape(pptx.ShapeType.roundRect, {
    x: panelX,
    y: panelY,
    w: panelW,
    h: panelH,
    radius: 0.08,
    fill: { color: C.panel },
    line: { color: C.border, pt: 1 },
  });

  const leftPad = 0.75;
  const rightPad = 0.75;
  const usableW = panelW - leftPad - rightPad;
  const gap = participants.length > 1 ? usableW / (participants.length - 1) : 0;

  const xMap = {};
  participants.forEach((p, i) => {
    const cx = panelX + leftPad + i * gap;
    xMap[p.id] = cx;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: cx - 0.7,
      y: headY,
      w: 1.4,
      h: headH,
      radius: 0.06,
      fill: { color: '0B1220' },
      line: { color: '334155', pt: 1 },
    });

    slide.addText(p.label, {
      x: cx - 0.67,
      y: headY + 0.09,
      w: 1.34,
      h: 0.2,
      fontFace: 'Segoe UI',
      fontSize: 8,
      color: C.text,
      align: 'center',
      valign: 'mid',
      bold: true,
    });

    slide.addShape(pptx.ShapeType.line, {
      x: cx,
      y: lifeTop,
      w: 0,
      h: lifeBottom - lifeTop,
      line: { color: '334155', pt: 1, dash: 'dash' },
    });
  });

  let y = opts.startY || (lifeTop + 0.25);
  const row = opts.rowH || 0.42;

  steps.forEach((s, idx) => {
    if (s.type === 'group') {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: panelX + 0.18,
        y: y - 0.13,
        w: panelW - 0.36,
        h: s.rows * row,
        radius: 0.03,
        fill: { color: s.fill || '0F172A', transparency: 35 },
        line: { color: s.border || '334155', pt: 1 },
      });
      slide.addText(s.text, {
        x: panelX + 0.26,
        y: y - 0.09,
        w: panelW - 0.6,
        h: 0.18,
        fontFace: 'Segoe UI Semibold',
        fontSize: 8,
        color: s.color || C.accent,
      });
      y += 0.1;
      return;
    }

    if (s.type === 'note') {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: panelX + 0.25,
        y: y - 0.08,
        w: panelW - 0.5,
        h: 0.25,
        radius: 0.03,
        fill: { color: '0F172A', transparency: 30 },
        line: { color: '334155', pt: 0.75 },
      });
      slide.addText(`${idx + 1}. ${s.text}`, {
        x: panelX + 0.35,
        y: y - 0.04,
        w: panelW - 0.7,
        h: 0.18,
        fontFace: 'Segoe UI',
        fontSize: 8,
        color: C.muted,
      });
      y += row;
      return;
    }

    const fromX = xMap[s.from];
    const toX = xMap[s.to];

    if (s.from === s.to) {
      const loopW = 0.45;
      slide.addShape(pptx.ShapeType.roundRect, {
        x: fromX + 0.04,
        y: y - 0.06,
        w: loopW,
        h: 0.18,
        radius: 0.02,
        fill: { color: '0B1220', transparency: 100 },
        line: { color: s.color || C.accent, pt: 1 },
      });
      slide.addText(`${idx + 1}. ${s.text}`, {
        x: fromX + 0.55,
        y: y - 0.07,
        w: 2.2,
        h: 0.16,
        fontFace: 'Segoe UI',
        fontSize: 7,
        color: C.text,
      });
      y += row;
      return;
    }

    const x = Math.min(fromX, toX);
    const w = Math.abs(toX - fromX);
    const leftToRight = fromX < toX;
    const lineColor = s.color || C.accent;

    const line = {
      color: lineColor,
      pt: 1,
      dash: s.dashed ? 'dash' : 'solid',
      beginArrowType: leftToRight ? 'none' : 'triangle',
      endArrowType: leftToRight ? 'triangle' : 'none',
    };

    slide.addShape(pptx.ShapeType.line, {
      x,
      y,
      w,
      h: 0,
      line,
    });

    slide.addText(`${idx + 1}. ${s.text}`, {
      x: x + 0.02,
      y: y - 0.14,
      w: Math.max(1.6, w - 0.04),
      h: 0.14,
      fontFace: 'Segoe UI',
      fontSize: 7,
      color: C.text,
      align: 'center',
    });

    y += row;
  });
}

// Cover
{
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55,
    y: 0.7,
    w: 12.25,
    h: 6.1,
    radius: 0.12,
    fill: { color: '0B1220' },
    line: { color: '1E293B', pt: 1 },
  });
  slide.addText('FinTrack', {
    x: 1.0,
    y: 1.15,
    w: 5.2,
    h: 0.8,
    fontFace: 'Segoe UI Semibold',
    fontSize: 48,
    color: 'FFFFFF',
    bold: true,
  });
  slide.addText('Architecture Sequence Diagrams (Visual)', {
    x: 1.0,
    y: 2.05,
    w: 10.5,
    h: 0.45,
    fontFace: 'Segoe UI',
    fontSize: 20,
    color: C.accent,
    bold: true,
  });
  slide.addText('These are rendered as actual PowerPoint shapes/arrows so diagrams are always visible.', {
    x: 1.0,
    y: 2.72,
    w: 10.8,
    h: 0.35,
    fontFace: 'Segoe UI',
    fontSize: 13,
    color: C.muted,
  });
  addFooter(slide, '1');
}

const slides = [
  {
    title: '0) Master Backend Request Lifecycle',
    subtitle: 'Exact end-to-end API flow from user action to database and back',
    participants: [
      { id: 'U', label: 'User' },
      { id: 'FE', label: 'App.tsx + api/client.ts' },
      { id: 'API', label: 'createApp (Express)' },
      { id: 'MW', label: 'validateBody/Query + errorHandler' },
      { id: 'C', label: 'TransactionController' },
      { id: 'S', label: 'TransactionService' },
      { id: 'R', label: 'TransactionRepository' },
      { id: 'P', label: 'PrismaClient (config/prisma.ts)' },
      { id: 'DB', label: 'SQLite' },
    ],
    steps: [
      { from: 'U', to: 'FE', text: 'Action (login/view/save)' },
      { from: 'FE', to: 'API', text: 'HTTP request (/api/v1/*)' },
      { from: 'API', to: 'MW', text: 'Parse + validate request (Zod DTOs)' },
      { from: 'MW', to: 'C', text: 'Valid request forwarded' },
      { from: 'C', to: 'S', text: 'Call service method (create/update/get)' },
      { from: 'S', to: 'R', text: 'Repository operation (find/create/update)' },
      { from: 'R', to: 'P', text: 'ORM query' },
      { from: 'P', to: 'DB', text: 'SQL read/write' },
      { from: 'DB', to: 'P', text: 'Result rows', dashed: true, color: C.ok },
      { from: 'P', to: 'R', text: 'Mapped objects', dashed: true, color: C.ok },
      { from: 'R', to: 'S', text: 'Domain data', dashed: true, color: C.ok },
      { from: 'S', to: 'C', text: 'Final response payload', dashed: true, color: C.ok },
      { from: 'C', to: 'API', text: 'Status + JSON body', dashed: true, color: C.ok },
      { from: 'API', to: 'FE', text: 'HTTP response', dashed: true, color: C.ok },
      { from: 'FE', to: 'U', text: 'Updated UI', dashed: true, color: C.ok },
    ],
  },
  {
    title: '1) App Startup',
    subtitle: 'Frontend + Backend + Prisma + SQLite',
    participants: [
      { id: 'U', label: 'User' },
      { id: 'F', label: 'React App' },
      { id: 'B', label: 'Express API' },
      { id: 'P', label: 'Prisma' },
      { id: 'D', label: 'SQLite' },
    ],
    steps: [
      { from: 'U', to: 'F', text: 'Open application' },
      { from: 'F', to: 'F', text: 'Load shell + check token' },
      { type: 'group', text: 'ALT: Token exists', rows: 3, fill: '0E1A2A', border: '1D4ED8' },
      { from: 'F', to: 'B', text: 'GET /api/v1/auth/me' },
      { from: 'B', to: 'P', text: 'Find user from token' },
      { from: 'P', to: 'D', text: 'SELECT user' },
      { from: 'D', to: 'P', text: 'User row', dashed: true, color: C.ok },
      { from: 'P', to: 'B', text: 'User object', dashed: true, color: C.ok },
      { from: 'B', to: 'F', text: '200 authenticated', dashed: true, color: C.ok },
      { type: 'group', text: 'ALT: No token', rows: 1, fill: '2A190E', border: 'B45309' },
      { from: 'F', to: 'U', text: 'Show login screen', dashed: true, color: C.warn },
    ],
  },
  {
    title: '2) Login + Initial Dashboard Load',
    subtitle: 'Parallel fetch after authentication',
    participants: [
      { id: 'U', label: 'User' },
      { id: 'F', label: 'Frontend' },
      { id: 'B', label: 'Backend' },
      { id: 'P', label: 'Prisma' },
      { id: 'D', label: 'SQLite' },
    ],
    steps: [
      { from: 'U', to: 'F', text: 'Submit credentials' },
      { from: 'F', to: 'B', text: 'POST /api/v1/auth/login' },
      { from: 'B', to: 'P', text: 'findFirst(username)' },
      { from: 'P', to: 'D', text: 'SELECT user' },
      { from: 'D', to: 'P', text: 'User row', dashed: true, color: C.ok },
      { from: 'B', to: 'F', text: 'Return token + profile', dashed: true, color: C.ok },
      { type: 'note', text: 'Frontend stores token in localStorage' },
      { type: 'group', text: 'PAR: Initial data fetch (dashboard, tx, categories, accounts, budgets, goals)', rows: 2, fill: '0E1A2A', border: '1D4ED8' },
      { from: 'F', to: 'B', text: 'GET multiple endpoints' },
      { from: 'B', to: 'P', text: 'Run domain queries + aggregates' },
      { from: 'P', to: 'D', text: 'SELECT + aggregate operations' },
      { from: 'B', to: 'F', text: 'Return JSON payloads', dashed: true, color: C.ok },
      { from: 'F', to: 'U', text: 'Render dashboard', dashed: true, color: C.ok },
    ],
  },
  {
    title: '3) Transaction Ledger Integrity',
    subtitle: 'Atomic balance-safe financial writes',
    participants: [
      { id: 'U', label: 'User' },
      { id: 'F', label: 'Frontend' },
      { id: 'C', label: 'Controller' },
      { id: 'S', label: 'Service' },
      { id: 'R', label: 'Repository' },
      { id: 'D', label: 'SQLite' },
    ],
    steps: [
      { from: 'U', to: 'F', text: 'Save transaction' },
      { from: 'F', to: 'C', text: 'POST/PUT /transactions' },
      { from: 'C', to: 'C', text: 'Validate request (Zod)' },
      { from: 'C', to: 'S', text: 'Invoke create/update/delete' },
      { type: 'group', text: 'IN TX: Revert old deltas (update) + apply new deltas + write record', rows: 2, fill: '0E1A2A', border: '1D4ED8' },
      { from: 'S', to: 'R', text: 'Load account/category references' },
      { from: 'R', to: 'D', text: 'SELECT records' },
      { from: 'S', to: 'S', text: 'Compute INCOME/EXPENSE/TRANSFER deltas' },
      { from: 'S', to: 'R', text: 'Update account balances' },
      { from: 'R', to: 'D', text: 'UPDATE balances' },
      { from: 'S', to: 'R', text: 'Write transaction row' },
      { from: 'R', to: 'D', text: 'INSERT/UPDATE/DELETE transaction' },
      { from: 'C', to: 'F', text: 'Success response', dashed: true, color: C.ok },
      { from: 'F', to: 'U', text: 'Toast + refresh view', dashed: true, color: C.ok },
    ],
  },
  {
    title: '4) Dashboard Analytics Orchestration',
    subtitle: 'Controller merges analytics + insights + forecast',
    participants: [
      { id: 'F', label: 'Frontend' },
      { id: 'AC', label: 'AnalyticsCtrl' },
      { id: 'AS', label: 'AnalyticsSvc' },
      { id: 'IS', label: 'InsightsSvc' },
      { id: 'FE', label: 'ForecastEng' },
      { id: 'D', label: 'SQLite' },
    ],
    steps: [
      { from: 'F', to: 'AC', text: 'GET /api/v1/analytics/dashboard' },
      { from: 'AC', to: 'AS', text: 'getDashboardData()' },
      { from: 'AS', to: 'D', text: 'Accounts/Tx/Subs/Debts queries' },
      { from: 'D', to: 'AS', text: 'Raw result sets', dashed: true, color: C.ok },
      { from: 'AS', to: 'AC', text: 'Computed dashboard core', dashed: true, color: C.ok },
      { from: 'AC', to: 'IS', text: 'generateInsights()' },
      { from: 'IS', to: 'AC', text: 'Proactive insights', dashed: true, color: C.ok },
      { from: 'AC', to: 'FE', text: 'getSpendForecast()' },
      { from: 'FE', to: 'AC', text: 'Forecast output', dashed: true, color: C.ok },
      { from: 'AC', to: 'F', text: 'Merged response payload', dashed: true, color: C.ok },
    ],
  },
  {
    title: '5) AI10 Query Pipeline',
    subtitle: 'Deterministic financial facts first, LLM optional second',
    participants: [
      { id: 'U', label: 'User' },
      { id: 'F', label: 'AI Chat UI' },
      { id: 'AIC', label: 'AI Ctrl' },
      { id: 'AIS', label: 'AI Service' },
      { id: 'FQE', label: 'Query Engine' },
      { id: 'LLM', label: 'Provider' },
    ],
    steps: [
      { from: 'U', to: 'F', text: 'Ask financial question' },
      { from: 'F', to: 'AIC', text: 'POST /api/v1/ai/query' },
      { from: 'AIC', to: 'AIS', text: 'processUserQuery(query)' },
      { from: 'AIS', to: 'FQE', text: 'tryExecute(query)' },
      { type: 'group', text: 'ALT A: Deterministic match -> exact backend tool result', rows: 2, fill: '0D2218', border: '15803D' },
      { from: 'FQE', to: 'AIS', text: 'Direct grounded answer', dashed: true, color: C.ok },
      { type: 'group', text: 'ALT B: Need reasoning -> provider plan + allowlisted tools + optional explanation', rows: 2, fill: '0E1A2A', border: '1D4ED8' },
      { from: 'AIS', to: 'LLM', text: 'Get validated orchestration plan' },
      { from: 'LLM', to: 'AIS', text: 'Plan JSON (validated)', dashed: true, color: C.ok },
      { from: 'AIS', to: 'LLM', text: 'Optional reasoning over verified facts' },
      { from: 'AIS', to: 'AIC', text: 'Grounded response', dashed: true, color: C.ok },
      { from: 'AIC', to: 'F', text: 'Answer + followups', dashed: true, color: C.ok },
      { from: 'F', to: 'U', text: 'Render response', dashed: true, color: C.ok },
    ],
  },
  {
    title: '6) Validation + Error Handler',
    subtitle: 'Cross-cut request safety path',
    participants: [
      { id: 'F', label: 'Frontend' },
      { id: 'M', label: 'Validator' },
      { id: 'C', label: 'Controller' },
      { id: 'E', label: 'ErrorHandler' },
    ],
    steps: [
      { from: 'F', to: 'M', text: 'Send request body/query' },
      { type: 'group', text: 'ALT: Validation fails', rows: 2, fill: '2A190E', border: 'B45309' },
      { from: 'M', to: 'E', text: 'Throw ValidationError/ZodError', color: C.warn },
      { from: 'E', to: 'F', text: '400 with structured field errors', dashed: true, color: C.warn },
      { type: 'group', text: 'ALT: Validation passes', rows: 1, fill: '0D2218', border: '15803D' },
      { from: 'M', to: 'C', text: 'Continue route execution' },
      { from: 'C', to: 'F', text: 'Success response', dashed: true, color: C.ok },
    ],
  },
];

let page = 2;
slides.forEach((s) => {
  const slide = pptx.addSlide();
  addTitle(slide, s.title, s.subtitle);
  drawSequence(slide, s.participants, s.steps);
  addFooter(slide, String(page));
  page += 1;
});

{
  const slide = pptx.addSlide();
  addTitle(slide, 'Backend Names Catalog', 'Explicit interfaces, services, repositories, and database tables');

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6,
    y: 1.55,
    w: 3.9,
    h: 5.35,
    radius: 0.08,
    fill: { color: '111827' },
    line: { color: '1F2937', pt: 1 },
  });
  slide.addText('Interfaces / Contracts', {
    x: 0.82,
    y: 1.78,
    w: 3.45,
    h: 0.25,
    fontFace: 'Segoe UI Semibold',
    fontSize: 12,
    color: C.accent,
    bold: true,
  });
  slide.addText(
    [
      'IAIProvider',
      'AIQueryRequest',
      'AIOrchestrationPlan',
      'AIToolCall',
      'AIQueryResponse',
      'AIReasoningResult',
      'CreateTransactionDto',
      'CreateTransactionInputDto',
      'QueryTransactionDto',
    ].join('\n'),
    {
      x: 0.82,
      y: 2.08,
      w: 3.45,
      h: 4.6,
      fontFace: 'Consolas',
      fontSize: 10,
      color: C.text,
      breakLine: true,
    }
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.72,
    y: 1.55,
    w: 3.9,
    h: 5.35,
    radius: 0.08,
    fill: { color: '111827' },
    line: { color: '1F2937', pt: 1 },
  });
  slide.addText('Core Services', {
    x: 4.95,
    y: 1.78,
    w: 3.45,
    h: 0.25,
    fontFace: 'Segoe UI Semibold',
    fontSize: 12,
    color: C.accent,
    bold: true,
  });
  slide.addText(
    [
      'AccountService',
      'AnalyticsService',
      'BudgetService',
      'CategoryService',
      'CreditCardService',
      'DebtService',
      'FinancialAnalysisEngine',
      'FinancialProfileService',
      'GoalService',
      'ProactiveInsightsService',
      'SubscriptionService',
      'TransactionService',
      'AIAssistantService',
      'FinancialQueryEngine',
      'FinancialDecisionService',
      'FinancialContextService',
    ].join('\n'),
    {
      x: 4.95,
      y: 2.08,
      w: 3.45,
      h: 4.6,
      fontFace: 'Consolas',
      fontSize: 10,
      color: C.text,
      breakLine: true,
    }
  );

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.84,
    y: 1.55,
    w: 3.9,
    h: 5.35,
    radius: 0.08,
    fill: { color: '111827' },
    line: { color: '1F2937', pt: 1 },
  });
  slide.addText('Repositories + DB Tables', {
    x: 9.07,
    y: 1.78,
    w: 3.45,
    h: 0.25,
    fontFace: 'Segoe UI Semibold',
    fontSize: 12,
    color: C.accent,
    bold: true,
  });
  slide.addText(
    [
      'Repositories:',
      'AccountRepository',
      'BudgetRepository',
      'CategoryRepository',
      'CreditCardRepository',
      'DebtRepository',
      'FinancialProfileRepository',
      'GoalRepository',
      'SubscriptionRepository',
      'TransactionRepository',
      '',
      'Tables:',
      'Account, Category, Transaction',
      'Subscription, Debt, FinancialProfile',
      'InsightFeedback, User, QuickItem',
      'Budget, Goal',
    ].join('\n'),
    {
      x: 9.07,
      y: 2.08,
      w: 3.45,
      h: 4.6,
      fontFace: 'Consolas',
      fontSize: 10,
      color: C.text,
      breakLine: true,
    }
  );

  addFooter(slide, String(page));
  page += 1;
}

{
  const slide = pptx.addSlide();
  addTitle(slide, 'Current Standing', 'Architecture quality snapshot');

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.8,
    w: 3.2,
    h: 2.0,
    radius: 0.1,
    fill: { color: '0A2238' },
    line: { color: '164E63', pt: 1 },
  });
  slide.addText('6.8 / 10', {
    x: 1.2,
    y: 2.25,
    w: 2.4,
    h: 0.6,
    align: 'center',
    fontFace: 'Segoe UI Semibold',
    fontSize: 34,
    color: '67E8F9',
    bold: true,
  });

  slide.addText(
    [
      'Strengths',
      '- Layered backend design with good domain separation',
      '- Financial integrity logic uses atomic transaction updates',
      '- AI10 pipeline prioritizes deterministic facts before LLM',
      '- Backend TypeScript build currently passes',
      '',
      'Current risks',
      '- Frontend build failing in runway simulator contract mismatch',
      '- Auth implementation needs production hardening',
      '- Large UI components indicate maintainability risk',
    ].join('\n'),
    {
      x: 4.4,
      y: 1.9,
      w: 8.0,
      h: 4.9,
      fontFace: 'Segoe UI',
      fontSize: 14,
      color: C.text,
      breakLine: true,
    }
  );

  addFooter(slide, String(page));
}

const out = path.resolve(__dirname, '..', '..', 'FinTrack_Architecture_Sequence_Diagrams_VISIBLE_v2.pptx');
pptx.writeFile({ fileName: out })
  .then(() => {
    console.log(`PPT generated: ${out}`);
  })
  .catch((err) => {
    console.error('PPT generation failed:', err);
    process.exit(1);
  });
