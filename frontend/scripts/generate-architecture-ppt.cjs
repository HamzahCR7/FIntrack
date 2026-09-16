const path = require('path');
const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pptx.author = 'GitHub Copilot';
pptx.company = 'FinTrack';
pptx.subject = 'FinTrack architecture sequence diagrams';
pptx.title = 'FinTrack Architecture - Sequence Diagrams';
pptx.lang = 'en-US';

const theme = {
  bg: '0F172A',
  card: '111827',
  text: 'E5E7EB',
  muted: '94A3B8',
  accent: '38BDF8',
  accent2: '22C55E',
  warn: 'F59E0B',
};

function addTitle(slide, title, subtitle) {
  slide.background = { color: theme.bg };
  slide.addText(title, {
    x: 0.6,
    y: 0.35,
    w: 12.1,
    h: 0.55,
    fontFace: 'Segoe UI Semibold',
    fontSize: 28,
    color: 'FFFFFF',
    bold: true,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 0.95,
      w: 12.1,
      h: 0.32,
      fontFace: 'Segoe UI',
      fontSize: 12,
      color: theme.muted,
    });
  }

  slide.addShape(pptx.ShapeType.line, {
    x: 0.6,
    y: 1.3,
    w: 12.1,
    h: 0,
    line: { color: '1E293B', pt: 1 },
  });
}

function addCodePanel(slide, title, code) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.55,
    y: 1.55,
    w: 12.25,
    h: 5.6,
    radius: 0.08,
    fill: { color: theme.card, transparency: 0 },
    line: { color: '1F2937', pt: 1 },
    shadow: { type: 'outer', color: '000000', blur: 2, angle: 45, distance: 2, opacity: 0.25 },
  });

  slide.addText(title, {
    x: 0.85,
    y: 1.78,
    w: 11.7,
    h: 0.35,
    fontFace: 'Segoe UI Semibold',
    fontSize: 14,
    color: theme.accent,
    bold: true,
  });

  slide.addText(code, {
    x: 0.85,
    y: 2.15,
    w: 11.65,
    h: 4.8,
    fontFace: 'Consolas',
    fontSize: 10,
    color: theme.text,
    valign: 'top',
    breakLine: true,
    margin: 0.05,
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

// Slide 1: Cover
{
  const slide = pptx.addSlide();
  slide.background = { color: theme.bg };
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
    y: 1.25,
    w: 5.4,
    h: 0.8,
    fontFace: 'Segoe UI Semibold',
    fontSize: 48,
    color: 'FFFFFF',
    bold: true,
  });

  slide.addText('Architecture Sequence Diagrams', {
    x: 1.0,
    y: 2.15,
    w: 8.5,
    h: 0.45,
    fontFace: 'Segoe UI',
    fontSize: 20,
    color: theme.accent,
    bold: true,
  });

  slide.addText('Frontend (React + Vite) -> Backend (Express + TypeScript) -> Data (Prisma + SQLite)\nwith AI10 deterministic-first financial reasoning pipeline', {
    x: 1.0,
    y: 2.8,
    w: 10.8,
    h: 1.1,
    fontFace: 'Segoe UI',
    fontSize: 14,
    color: theme.muted,
    breakLine: true,
  });

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 4.6,
    w: 4.2,
    h: 1.55,
    radius: 0.1,
    fill: { color: '0F1C32' },
    line: { color: '1E3A8A', pt: 1 },
  });
  slide.addText('Current snapshot\nDate: 2026-09-13\nStatus: Backend builds, frontend has runway compile gaps', {
    x: 1.2,
    y: 4.85,
    w: 3.8,
    h: 1.2,
    fontFace: 'Segoe UI',
    fontSize: 11,
    color: 'BFDBFE',
    breakLine: true,
  });

  addFooter(slide, '1');
}

const diagrams = [
  {
    title: '1) App Startup (Frontend + Backend + DB)',
    code: `sequenceDiagram
    autonumber
    participant U as User Browser
    participant F as React App (Vite)
    participant B as Express API
    participant P as Prisma Client
    participant D as SQLite DB

    U->>F: Open app URL
    F->>F: Load App shell + check local token
    alt Token exists
        F->>B: GET /api/v1/auth/me (Bearer token)
        B->>P: find user by decoded token
        P->>D: SELECT user
        D-->>P: user row
        P-->>B: user object
        B-->>F: 200 Authenticated
    else No token
        F-->>U: Show Login Screen
    end`
  },
  {
    title: '2) Login + Initial Dashboard Load',
    code: `sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend (App + API Client)
    participant B as Backend Controllers
    participant P as Prisma
    participant D as SQLite

    U->>F: Submit username/password
    F->>B: POST /api/v1/auth/login
    B->>P: findFirst(username)
    P->>D: SELECT user
    D-->>P: user row
    B-->>F: token + user profile
    F->>F: Save token in localStorage

    par Parallel initial fetch
      F->>B: GET /analytics/dashboard
      F->>B: GET /transactions
      F->>B: GET /categories
      F->>B: GET /accounts
      F->>B: GET /budgets
      F->>B: GET /goals
    end

    B->>P: Domain queries and aggregates
    P->>D: SELECT + aggregate operations
    B-->>F: JSON payloads
    F-->>U: Render dashboard`
  },
  {
    title: '3) Transaction Ledger Integrity Flow',
    code: `sequenceDiagram
    autonumber
    participant U as User
    participant F as Frontend Modal
    participant C as TransactionController
    participant S as TransactionService
    participant R as Repositories
    participant P as Prisma TX
    participant D as SQLite

    U->>F: Save transaction
    F->>C: POST/PUT /api/v1/transactions
    C->>C: Validate request (Zod)
    C->>S: create/update/delete
    S->>P: Begin DB transaction
    S->>R: Resolve accounts/categories
    R->>D: SELECT records
    S->>S: Compute balance deltas
    S->>R: Update account balances
    R->>D: UPDATE balances
    S->>R: Write transaction row
    R->>D: INSERT/UPDATE/DELETE
    P-->>S: Commit atomically
    C-->>F: success JSON
    F-->>U: Toast + refresh`
  },
  {
    title: '4) Dashboard Analytics Orchestration',
    code: `sequenceDiagram
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
    AS->>P: accounts + tx + subs + debts queries
    P->>D: aggregates and lists
    AS-->>AC: computed dashboard core
    AC->>IS: generateInsights()
    IS-->>AC: proactive insights
    AC->>FE: getSpendForecast()
    FE-->>AC: forecast data
    AC-->>F: merged dashboard payload`
  },
  {
    title: '5) AI10 Query Pipeline (Deterministic First)',
    code: `sequenceDiagram
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
      FQE->>TR: execute exact tool(s)
      TR->>DB: fetch verified facts
      FQE-->>AIS: direct answer
    else Planning/reasoning needed
      AIS->>LLM: safe orchestration plan
      AIS->>TR: execute allowlisted tools
      TR->>DB: fetch financial context
      AIS->>LLM: optional reasoning on verified context
    end

    AIS-->>AIC: grounded response
    AIC-->>F: answer + followups
    F-->>U: render response`
  },
  {
    title: '6) Validation + Error Handling Cross-Cut',
    code: `sequenceDiagram
    autonumber
    participant F as Frontend
    participant M as Validate Middleware
    participant C as Controller
    participant E as Error Handler

    F->>M: request body/query
    alt Validation fails
      M->>E: ValidationError/ZodError
      E-->>F: 400 fail + field errors
    else Passes validation
      M->>C: continue
      C-->>F: success response
    end`
  },
];

let page = 2;
for (const block of diagrams) {
  const slide = pptx.addSlide();
  addTitle(slide, block.title, 'Mermaid-compatible sequence flow extracted from current codebase');
  addCodePanel(slide, 'Diagram', block.code);
  addFooter(slide, String(page));
  page += 1;
}

// Final slide: Architecture assessment summary
{
  const slide = pptx.addSlide();
  addTitle(slide, 'Current Standing (Architecture Rating)', 'Snapshot based on build checks and code structure review');

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7,
    y: 1.7,
    w: 3.0,
    h: 2.1,
    radius: 0.1,
    fill: { color: '0A2238' },
    line: { color: '164E63', pt: 1 },
  });
  slide.addText('6.8 / 10', {
    x: 1.1,
    y: 2.2,
    w: 2.2,
    h: 0.7,
    align: 'center',
    fontFace: 'Segoe UI Semibold',
    fontSize: 34,
    color: '67E8F9',
    bold: true,
  });
  slide.addText('Overall', {
    x: 1.1,
    y: 3.0,
    w: 2.2,
    h: 0.3,
    align: 'center',
    fontFace: 'Segoe UI',
    fontSize: 12,
    color: 'BAE6FD',
  });

  const bullets = [
    'Strong domain model and service-repository layering in backend',
    'Good financial integrity logic for account balance updates',
    'AI10 architecture correctly prioritizes deterministic facts before LLM reasoning',
    'Backend TypeScript build passes',
    'Frontend currently fails build in RunwaySimulatorCard due to API/type contract drift',
    'Auth implementation needs production hardening (token/password strategy)',
    'Very large UI components indicate refactor opportunity for maintainability',
  ];

  slide.addShape(pptx.ShapeType.roundRect, {
    x: 4.1,
    y: 1.7,
    w: 8.7,
    h: 5.0,
    radius: 0.1,
    fill: { color: '111827' },
    line: { color: '1F2937', pt: 1 },
  });

  let y = 2.0;
  bullets.forEach((text, index) => {
    const color = index <= 3 ? theme.accent2 : index === 4 ? theme.warn : theme.text;
    slide.addText(`• ${text}`, {
      x: 4.45,
      y,
      w: 8.1,
      h: 0.52,
      fontFace: 'Segoe UI',
      fontSize: 13,
      color,
      breakLine: true,
    });
    y += 0.66;
  });

  addFooter(slide, String(page));
}

const outputPath = path.resolve(__dirname, '..', '..', 'FinTrack_Architecture_Sequence_Diagrams.pptx');

pptx.writeFile({ fileName: outputPath })
  .then(() => {
    console.log(`PPT generated: ${outputPath}`);
  })
  .catch((err) => {
    console.error('Failed to generate PPT:', err);
    process.exit(1);
  });
