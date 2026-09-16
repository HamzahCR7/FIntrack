import { Transaction, DashboardData } from '../types';
import { formatCurrency } from '../components/SummaryCards';

// Export Transactions to CSV
export const exportTransactionsToCSV = (transactions: Transaction[], filename = 'FinTrack_Transactions.csv') => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to export.');
    return;
  }

  const headers = [
    'Transaction ID',
    'Date',
    'Type',
    'Amount (INR)',
    'Category',
    'Merchant / Payee',
    'Source Account',
    'Destination Account',
    'Payment Method',
    'Description',
    'Recurring Subscription',
  ];

  const rows = transactions.map((tx) => [
    `"${tx.id}"`,
    `"${new Date(tx.transactionDate).toISOString().split('T')[0]}"`,
    `"${tx.type}"`,
    `"${tx.amount}"`,
    `"${tx.category?.name || ''}"`,
    `"${(tx.merchant || '').replace(/"/g, '""')}"`,
    `"${tx.sourceAccount?.name || ''}"`,
    `"${tx.destinationAccount?.name || ''}"`,
    `"${tx.paymentMethod}"`,
    `"${(tx.description || '').replace(/"/g, '""')}"`,
    `"${tx.isSubscription ? 'Yes' : 'No'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export Power BI Ready Dataset with DAX Measures & Star Schema Structure
export const exportPowerBIDataset = (transactions: Transaction[], dashboardData?: DashboardData | null) => {
  if (!transactions || transactions.length === 0) {
    alert('No transactions available to generate Power BI dataset.');
    return;
  }

  const dataset = {
    metadata: {
      appName: 'FinTrack PowerBI Analytics Engine',
      generatedAt: new Date().toISOString(),
      schemaVersion: '2.0-StarSchema',
      description: 'Power BI Desktop Data Model with Fact & Dimension tables + DAX Measures',
    },
    tables: {
      Fact_Transactions: transactions.map((tx) => ({
        TransactionID: tx.id,
        Date: new Date(tx.transactionDate).toISOString().split('T')[0],
        Type: tx.type,
        Amount: tx.amount,
        CategoryID: tx.categoryId || 'UNASSIGNED',
        CategoryName: tx.category?.name || 'Unassigned',
        SourceAccount: tx.sourceAccount?.name || 'N/A',
        DestinationAccount: tx.destinationAccount?.name || 'N/A',
        PaymentMethod: tx.paymentMethod,
        Merchant: tx.merchant || '',
        IsSubscription: tx.isSubscription ? 1 : 0,
      })),
      Dim_Categories: (dashboardData?.spendingByCategory || []).map((cat) => ({
        CategoryName: cat.name,
        TotalAmount: cat.amount,
        PercentageShare: cat.percentage,
      })),
      Dim_MonthlyTrends: (dashboardData?.monthlyTrends || []).map((m) => ({
        Month: m.month,
        TotalIncome: m.income,
        TotalExpenses: m.expenses,
        NetSavings: m.savings,
        SavingsRatePercent: m.income > 0 ? Number(((m.savings / m.income) * 100).toFixed(2)) : 0,
      })),
    },
    daxMeasures: [
      {
        measureName: 'Total Expense',
        daxFormula: 'Total Expense = CALCULATE(SUM(Fact_Transactions[Amount]), Fact_Transactions[Type] = "EXPENSE")',
      },
      {
        measureName: 'Total Income',
        daxFormula: 'Total Income = CALCULATE(SUM(Fact_Transactions[Amount]), Fact_Transactions[Type] = "INCOME")',
      },
      {
        measureName: 'Net Savings',
        daxFormula: 'Net Savings = [Total Income] - [Total Expense]',
      },
      {
        measureName: 'Savings Rate %',
        daxFormula: 'Savings Rate % = DIVIDE([Net Savings], [Total Income], 0) * 100',
      },
      {
        measureName: 'Avg Daily Spend',
        daxFormula: 'Avg Daily Spend = AVERAGEX(VALUES(Fact_Transactions[Date]), [Total Expense])',
      },
    ],
  };

  const jsonStr = JSON.stringify(dataset, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'FinTrack_PowerBI_Dataset.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate & Print Printable PDF Financial Summary Report
export const printPDFReport = (dashboardData: DashboardData, transactions: Transaction[]) => {
  if (!dashboardData) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to generate the printable PDF report.');
    return;
  }

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const categoryRows = (dashboardData.spendingByCategory || [])
    .map(
      (cat) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${cat.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(cat.amount)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${cat.percentage}%</td>
      </tr>
    `
    )
    .join('');

  const recentTxRows = (transactions || []).slice(0, 15)
    .map(
      (tx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date(tx.transactionDate).toLocaleDateString('en-IN')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.merchant || tx.description || 'Transaction'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.type}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tx.category?.name || '—'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${
          tx.type === 'INCOME' ? '#10b981' : tx.type === 'EXPENSE' ? '#f43f5e' : '#3b82f6'
        }">${tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}${formatCurrency(tx.amount)}</td>
      </tr>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>FinTrack Financial Summary Report - ${dateStr}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 30px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
          .logo { font-size: 24px; font-weight: 800; color: #1e293b; }
          .logo span { color: #3b82f6; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
          .card-val { font-size: 20px; font-weight: 700; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 8px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; }
          .section-title { font-size: 16px; font-weight: 700; margin-top: 30px; margin-bottom: 10px; color: #0f172a; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>

        <div class="header">
          <div class="logo">Fin<span>Track</span> Ledger Report</div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <div><strong>Generated:</strong> ${dateStr}</div>
            <div>Phase 4 Financial Statement</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="card">
            <div class="card-title">Total Balance</div>
            <div class="card-val" style="color: #3b82f6;">${formatCurrency(dashboardData.summary.totalBalance)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Income</div>
            <div class="card-val" style="color: #10b981;">${formatCurrency(dashboardData.summary.totalIncome)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Expenses</div>
            <div class="card-val" style="color: #f43f5e;">${formatCurrency(dashboardData.summary.totalExpenses)}</div>
          </div>
          <div class="card">
            <div class="card-title">Net Savings</div>
            <div class="card-val" style="color: #06b6d4;">${formatCurrency(dashboardData.summary.savings)}</div>
          </div>
        </div>

        <div class="section-title">Spending by Category Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: right;">Amount (INR)</th>
              <th style="text-align: right;">Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows || '<tr><td colSpan="3">No category data recorded.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Recent Ledger Transactions</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant / Payee</th>
              <th>Type</th>
              <th>Category</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${recentTxRows || '<tr><td colSpan="5">No transactions recorded.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          FinTrack Personal Financial Management System • Confidential Personal Report
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          }
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};
