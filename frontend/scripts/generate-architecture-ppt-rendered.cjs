const fs = require('fs');
const path = require('path');
const PptxGenJS = require('pptxgenjs');

const theme = {
  bg: '0F172A',
  panel: '111827',
  text: 'E5E7EB',
  muted: '94A3B8',
  accent: '38BDF8',
};

const diagrams = [
  {
    title: '1) App Startup (Frontend + Backend + DB)',
    mermaid: `sequenceDiagram
    autonumber
    participant U as User Browser
    participant F as React App (Vite)
    participant B as Express API
    participant P as Prisma Client
    participant D as SQLite DB

    U->>F: Open app URL
    F->>F: Load app shell + check local token
    alt Token exists
      F->>B: GET /api/v1/auth/me
      B->>P: Find user from token
      P->>D: SELECT user
      D-->>P: User row
      P-->>B: User object
      B-->>F: 200 Authenticated
    else No token
      F-->>U: Show login screen
    end`,
  },
  {
    title: '2) Login + Initial Dashboard Load',
    mermaid: `sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant P as Prisma
    participant D as SQLite

    U->>F: Submit credentials
    F->>B: POST /api/v1/auth/login
    B->>P: findFirst(username)
    P->>D: SELECT user
    D-->>P: User row
    B-->>F: Token + profile
    F->>F: Save token in localStorage

    par Parallel fetch
      F->>B: GET /analytics/dashboard
      F->>B: GET /transactions
      F->>B: GET /categories
      F->>B: GET /accounts
      F->>B: GET /budgets
      F->>B: GET /goals
    end

    B->>P: Aggregate and list queries
    P->>D: SELECT + aggregate
    B-->>F: JSON payloads
    F-->>U: Render dashboard`,
  },
  {
    title: '3) Transaction Ledger Integrity Flow',
    mermaid: `sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend Modal
    participant C as TransactionController
    participant S as TransactionService
    participant R as Repositories
    participant P as Prisma Transaction
    participant D as SQLite

    U->>F: Save transaction
    F->>C: POST/PUT /api/v1/transactions
    C->>C: Validate body/query (Zod)
    C->>S: create/update/delete
    S->>P: Begin DB transaction
    S->>R: Resolve accounts + categories
    R->>D: SELECT records
    S->>S: Compute balance deltas
    S->>R: Update account balances
    R->>D: UPDATE accounts
    S->>R: Write transaction row
    R->>D: INSERT/UPDATE/DELETE transaction
    P-->>S: Commit atomically
    C-->>F: Success JSON
    F-->>U: Toast + refresh`,
  },
  {
    title: '4) Dashboard Analytics Orchestration',
    mermaid: `sequenceDiagram
    autonumber
    participant F as Frontend
    participant AC as AnalyticsController
    participant AS as AnalyticsService
    participant IS as ProactiveInsightsService
    participant FE as FinancialAnalysisEngine
    participant P as Prisma
    participant D as SQLite

    F->>AC: GET /api/v1/analytics/dashboard
    AC->>AS: getDashboardData()
    AS->>P: Query accounts, tx, subs, debts
    P->>D: Aggregates + lists
    D-->>P: Data sets
    P-->>AS: Raw results
    AS-->>AC: Computed dashboard core
    AC->>IS: generateInsights()
    IS-->>AC: Insights cards
    AC->>FE: getSpendForecast()
    FE-->>AC: Forecast object
    AC-->>F: Merged dashboard payload`,
  },
  {
    title: '5) AI10 Query Pipeline (Deterministic First)',
    mermaid: `sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend AI Chat
    participant AIC as AIController
    participant AIS as AIAssistantService
    participant FQE as FinancialQueryEngine
    participant TR as FinancialToolRegistry
    participant DB as Prisma/SQLite
    participant LLM as SecureOnlineProvider (Optional)

    U->>F: Ask finance question
    F->>AIC: POST /api/v1/ai/query
    AIC->>AIS: processUserQuery(query)
    AIS->>FQE: tryExecute(query)

    alt Deterministic match
      FQE->>TR: Execute exact backend tool(s)
      TR->>DB: Fetch verified ledger facts
      FQE-->>AIS: Direct answer
    else Needs planning/reasoning
      AIS->>LLM: Generate safe orchestration plan
      AIS->>TR: Execute allowlisted tools
      TR->>DB: Fetch financial context
      AIS->>LLM: Optional reasoning over verified data
    end

    AIS-->>AIC: Grounded response
    AIC-->>F: Answer + followups
    F-->>U: Render response`,
  },
  {
    title: '6) Validation + Error Handling',
    mermaid: `sequenceDiagram
    autonumber
    participant F as Frontend
    participant M as Validation Middleware
    participant C as Controller
    participant E as Error Handler

    F->>M: Request body/query
    alt Validation fails
      M->>E: Throw ValidationError/ZodError
      E-->>F: 400 + field errors
    else Validation passes
      M->>C: Continue
      C-->>F: Success response
    end`,
  },
];

function addTitle(slide, title, subtitle) {
  slide.background = { color: theme.bg };
  slide.addText(title, {
    x: 0.6,
    y: 0.35,
    w: 12.1,
    h: 0.55,
    fontFace: 'Segoe UI Semibold',
    fontSize: 26,
    color: 'FFFFFF',
    bold: true,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 0.92,
      w: 12.1,
      h: 0.28,
      fontFace: 'Segoe UI',
      fontSize: 11,
      color: theme.muted,
    });
  }

  slide.addShape('line', {
    x: 0.6,
    y: 1.25,
    w: 12.1,
    h: 0,
    line: { color: '1E293B', pt: 1 },
  });
}

function addFooter(slide, page) {
  slide.addText(`FinTrack Architecture | ${page}`, {
    x: 0.6,
    y: 7.1,
    w: 12.0,
    h: 0.2,
    fontFace: 'Segoe UI',
    fontSize: 9,
    color: '64748B',
    align: 'right',
  });
}

async function renderMermaidPng(mermaidText, outputFilePath) {
  const response = await fetch('https://kroki.io/mermaid/png?scale=2', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Accept': 'image/png',
    },
    body: mermaidText,
  });

  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Kroki render failed (${response.status}): ${msg}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(outputFilePath, Buffer.from(arrayBuffer));
}

async function buildDeck() {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'GitHub Copilot';
  pptx.company = 'FinTrack';
  pptx.subject = 'FinTrack architecture sequence diagrams';
  pptx.title = 'FinTrack Architecture - Rendered Sequence Diagrams';

  const diagramsDir = path.resolve(__dirname, '.diagram-cache');
  if (!fs.existsSync(diagramsDir)) {
    fs.mkdirSync(diagramsDir, { recursive: true });
  }

  const cover = pptx.addSlide();
  cover.background = { color: theme.bg };
  cover.addShape(pptx.ShapeType.roundRect, {
    x: 0.55,
    y: 0.7,
    w: 12.25,
    h: 6.1,
    radius: 0.12,
    fill: { color: '0B1220' },
    line: { color: '1E293B', pt: 1 },
  });

  cover.addText('FinTrack', {
    x: 1.0,
    y: 1.25,
    w: 5.4,
    h: 0.8,
    fontFace: 'Segoe UI Semibold',
    fontSize: 48,
    color: 'FFFFFF',
    bold: true,
  });

  cover.addText('Rendered Architecture Sequence Diagrams', {
    x: 1.0,
    y: 2.15,
    w: 10.3,
    h: 0.45,
    fontFace: 'Segoe UI',
    fontSize: 20,
    color: theme.accent,
    bold: true,
  });

  cover.addText('These slides contain visual sequence diagrams (PNG) rendered from Mermaid, not plain code.', {
    x: 1.0,
    y: 2.85,
    w: 10.8,
    h: 0.7,
    fontFace: 'Segoe UI',
    fontSize: 13,
    color: theme.muted,
    breakLine: true,
  });

  addFooter(cover, '1');

  let page = 2;
  for (let i = 0; i < diagrams.length; i += 1) {
    const d = diagrams[i];
    const pngPath = path.join(diagramsDir, `diagram-${String(i + 1).padStart(2, '0')}.png`);
    await renderMermaidPng(d.mermaid, pngPath);

    const slide = pptx.addSlide();
    addTitle(slide, d.title, 'Rendered from current architecture flows');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 1.5,
      w: 12.25,
      h: 5.7,
      radius: 0.08,
      fill: { color: theme.panel },
      line: { color: '1F2937', pt: 1 },
    });

    slide.addImage({
      path: pngPath,
      x: 0.75,
      y: 1.72,
      w: 11.85,
      h: 5.25,
    });

    addFooter(slide, String(page));
    page += 1;
  }

  const summary = pptx.addSlide();
  addTitle(summary, 'Current Standing', 'Architecture quality snapshot as of 2026-09-13');
  summary.addText('Overall Architecture Rating: 6.8 / 10', {
    x: 0.9,
    y: 1.9,
    w: 5.8,
    h: 0.6,
    fontFace: 'Segoe UI Semibold',
    fontSize: 26,
    color: '67E8F9',
    bold: true,
  });

  summary.addText(
    [
      'Strengths:',
      '- Strong domain coverage and backend layering',
      '- Deterministic-first AI financial pipeline',
      '- Backend build currently passes',
      '',
      'Risks:',
      '- Frontend build currently fails in runway simulator contract',
      '- Auth flow requires production hardening',
      '- Large UI components reduce maintainability',
    ].join('\n'),
    {
      x: 0.95,
      y: 2.7,
      w: 11.6,
      h: 3.8,
      fontFace: 'Segoe UI',
      fontSize: 14,
      color: theme.text,
      breakLine: true,
    }
  );
  addFooter(summary, String(page));

  const outputPath = path.resolve(__dirname, '..', '..', 'FinTrack_Architecture_Sequence_Diagrams_Visual.pptx');
  await pptx.writeFile({ fileName: outputPath });
  console.log(`PPT generated: ${outputPath}`);
}

buildDeck().catch((err) => {
  console.error('Failed to generate rendered PPT:', err);
  process.exit(1);
});
